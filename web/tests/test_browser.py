"""Navegador real → Nginx → backend → PostGIS; fontes demo, sem chaves externas."""
import io
import os
import uuid

import httpx
import pytest
from PIL import Image
from playwright.sync_api import sync_playwright, expect

BASE=os.environ['E2E_BASE_URL']
NEW_PASSWORD='e2e-only-password-12345'


def login(page,username,password):
    page.goto(BASE)
    page.locator('#login-form [name=username]').fill(username)
    page.locator('#login-form [name=password]').fill(password)
    page.locator('#login-form button').click()


def change_password(page,old,new):
    expect(page.locator('#password-view')).to_be_visible()
    expect(page.locator('#workspace')).to_be_hidden()
    page.locator('#password-form [name=old_password]').fill(old)
    page.locator('#password-form [name=new_password]').fill(new)
    page.locator('#password-form button').click()
    expect(page.locator('#login-view')).to_be_visible()
    expect(page.locator('#notice')).to_contain_text('Senha alterada')


@pytest.fixture(scope='session')
def browser():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        browser.new_context().close()
        yield browser
        browser.close()


@pytest.fixture(scope='session')
def admin(browser):
    context=browser.new_context()
    page=context.new_page()
    login(page,'coop.e2e',os.environ['E2E_ADMIN_PASSWORD'])
    change_password(page,os.environ['E2E_ADMIN_PASSWORD'],NEW_PASSWORD)
    context.close()
    return ('coop.e2e',NEW_PASSWORD)


@pytest.fixture
def page(browser):
    context=browser.new_context(viewport={'width':1280,'height':960},
        geolocation={'latitude':-22.9,'longitude':-47.06},permissions=['geolocation'])
    page=context.new_page()
    page.set_default_timeout(15000)
    yield page
    context.close()


def image():
    output=io.BytesIO()
    Image.new('RGB',(32,32),'green').save(output,format='PNG')
    return output.getvalue()


def api_token(username,password):
    response=httpx.post(BASE+'/v1/auth/login',json={'username':username,'password':password})
    assert response.status_code==200
    return {'Authorization':'Bearer '+response.json()['access_token']}


def seed_farmer(admin):
    username='e2e.'+uuid.uuid4().hex[:12]
    with httpx.Client(base_url=BASE,headers=api_token(*admin)) as client:
        farmer=client.post('/v1/farmers',json={'name':'Pessoa fictícia de teste','username':username})
        assert farmer.status_code==201
        f=farmer.json()
        prop=client.post('/v1/properties',json={'farmer_id':f['id'],'name':'Sítio de teste',
            'municipality':'Campinas','state':'SP','latitude':-22.9,'longitude':-47.06})
        assert prop.status_code==201
    # A troca via API aqui prepara os testes de paginação/retry; a troca na UI é testada abaixo.
    with httpx.Client(base_url=BASE,headers=api_token(username,f['temporary_password'])) as client:
        assert client.post('/v1/auth/password',json={'old_password':f['temporary_password'],
            'new_password':NEW_PASSWORD}).status_code==200
    return username,NEW_PASSWORD,prop.json()['id']


def test_full_photo_evidence_and_human_review_journey(page,admin):
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    username='e2e.'+uuid.uuid4().hex[:12]
    login(page,*admin)
    expect(page.locator('#cooperative-tools')).to_be_visible()
    page.locator('#cooperative-tools summary').click()
    page.locator('#farmer-form [name=name]').fill('Agricultora fictícia')
    page.locator('#farmer-form [name=username]').fill(username)
    page.locator('#farmer-form button').click()
    expect(page.locator('#temporary-password')).to_contain_text('Senha temporária:')
    temp=page.locator('#temporary-password').inner_text().split('Senha temporária: ')[1].split('.')[0]
    select=page.locator('#property-form [name=farmer_id]')
    expect(select.locator('option').filter(has_text=username)).to_have_count(1)
    select.select_option(label=f'Agricultora fictícia ({username})')
    for name,value in {'name':'Sítio UI','municipality':'Campinas','state':'SP','latitude':'-22.9','longitude':'-47.06'}.items():
        page.locator(f'#property-form [name={name}]').fill(value)
    page.locator('#property-form button').click()
    expect(page.locator('#notice')).to_contain_text('Propriedade cadastrada')
    page.locator('#logout').click()
    login(page,username,temp)
    change_password(page,temp,NEW_PASSWORD)
    login(page,username,NEW_PASSWORD)
    expect(page.locator('#farmer-tools')).to_be_visible()
    expect(page.locator('#cooperative-tools')).to_be_hidden()
    page.locator('#incident-form [name=photo]').set_input_files({'name':'test.png','mimeType':'image/png','buffer':image()})
    description='Relato <img src=x onerror="window.__xss=1"> de teste'
    page.locator('#incident-form [name=description]').fill(description)
    page.locator('#get-location').click()
    expect(page.locator('#location-status')).to_contain_text('Localização autorizada')
    page.locator('#send-incident').click()
    expect(page.locator('#notice')).to_contain_text('Relato registrado',timeout=120000)
    expect(page.locator('#detail')).to_contain_text(description)
    expect(page.locator('#detail').get_by_text('DADOS SIMULADOS',exact=True).first).to_be_visible()
    expect(page.locator('#detail')).to_contain_text('no_nearby_hotspot')
    expect(page.locator('#detail')).to_contain_text('DEMO meteorologia')
    expect(page.locator('#review-form')).to_have_count(0)
    page.wait_for_function('document.querySelector("#detail img")?.naturalWidth > 0')
    assert page.evaluate('window.__xss') is None
    assert page.evaluate('localStorage.length + sessionStorage.length')==0
    with httpx.Client(base_url=BASE,headers=api_token(username,NEW_PASSWORD)) as client:
        items=client.get('/v1/incidents').json()
        assert len(items)==1
        iid=items[0]['id']
        detail=client.get('/v1/incidents/'+iid).json()
        assert detail['environment_snapshot']['query']['latitude']==-22.9
        assert detail['status']=='submitted'
        assert client.patch(f'/v1/incidents/{iid}/review',json={'status':'under_review','notes':'Teste negado'}).status_code==403
    assert httpx.get(BASE+f'/v1/incidents/{iid}/photo').status_code==401
    page.locator('#logout').click()
    expect(page.locator('#detail img')).to_have_count(0)
    login(page,*admin)
    page.locator('.incident-card').filter(has_text=description).click()
    for status in ['under_review','verified','escalated']:
        page.locator('#review-form [name=status]').select_option(status)
        page.locator('#review-form [name=notes]').fill('Revisão humana fictícia de teste')
        page.locator('#review-form button').click()
        expect(page.locator('#notice')).to_contain_text('Revisão registrada')
        if status!='escalated':
            expected='verified' if status=='under_review' else 'escalated'
            expect(page.locator(f'#review-form option[value={expected}]')).to_have_count(1)
    expect(page.locator('#detail .review-entry')).to_have_count(3)
    assert not errors


def test_real_pagination_uses_next_and_previous(page,admin):
    username,password,prop=seed_farmer(admin)
    with httpx.Client(base_url=BASE,headers=api_token(username,password),timeout=30) as client:
        for i in range(11):
            response=client.post('/v1/incidents',data={'metadata':__import__('json').dumps({
                'property_id':prop,'client_request_id':str(uuid.uuid4()),'description':f'Página {i}'})},
                files={'photo':('photo.png',image(),'image/png')})
            assert response.status_code==201
    login(page,username,password)
    expect(page.locator('.incident-card')).to_have_count(10)
    page.locator('#next').click()
    expect(page.locator('#page-label')).to_have_text('Página 2')
    expect(page.locator('.incident-card')).to_have_count(1)
    expect(page.locator('#next')).to_be_disabled()
    page.locator('#previous').click()
    expect(page.locator('.incident-card')).to_have_count(10)


def test_lost_response_retries_same_uuid_without_duplicate(page,admin):
    username,password,_=seed_farmer(admin)
    login(page,username,password)
    expect(page.locator('#farmer-tools')).to_be_visible()
    lost=[]
    def intercept(route):
        if route.request.method=='POST' and not lost:
            response=route.fetch(timeout=120000)
            assert response.status==201
            lost.append(True)
            route.abort('failed')
        else:route.continue_()
    page.route('**/v1/incidents',intercept)
    page.locator('#incident-form [name=photo]').set_input_files({'name':'test.png','mimeType':'image/png','buffer':image()})
    page.locator('#send-incident').click()
    expect(page.locator('#notice')).to_have_class('error',timeout=120000)
    expect(page.locator('#incident-form [name=photo]')).to_be_disabled()
    page.locator('#send-incident').click()
    expect(page.locator('#notice')).to_contain_text('Relato registrado',timeout=120000)
    with httpx.Client(base_url=BASE,headers=api_token(username,password)) as client:
        assert len(client.get('/v1/incidents').json())==1


def test_mobile_and_location_refusal_allow_submission(browser,admin):
    username,password,_=seed_farmer(admin)
    context=browser.new_context(viewport={'width':390,'height':844})
    context.add_init_script("Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_,fail)=>fail({code:1})}})")
    page=context.new_page()
    login(page,username,password)
    expect(page.locator('#farmer-tools')).to_be_visible()
    page.locator('#get-location').click()
    expect(page.locator('#location-status')).to_contain_text('Localização não obtida')
    page.locator('#incident-form [name=photo]').set_input_files({'name':'test.png','mimeType':'image/png','buffer':image()})
    page.locator('#send-incident').click()
    expect(page.locator('#notice')).to_contain_text('Relato registrado',timeout=120000)
    expect(page.locator('#detail')).to_contain_text('Focos indisponíveis ou não consultados')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    context.close()
