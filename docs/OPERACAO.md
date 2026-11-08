# Operação e segurança — Fase 5

## Instalação e atualização

Nova instalação: `python scripts/configure.py` cria `.env` privado, com três segredos distintos, sem eco. Depois `docker compose up --build -d`, bootstrap e interface na porta 8080 conforme INTERFACE.md. Não versionar `.env` nem chaves; não há conta padrão. Senhas de banco precisam ser URL-safe na URL montada pelo Compose.

Instalação existente: preserve usuários/senha do migrador e volumes. Acrescente `POSTGRES_APP_USER=terra_firma_app` e `POSTGRES_APP_PASSWORD` novo e distinto ao `.env` privado (gerador não sobrescreve arquivo). Não mude `POSTGRES_USER`/senha sobre volume já inicializado: o container não redefine credenciais existentes. Faça backup de banco e fotos antes de atualizar. `docker compose up --build -d` aplica migração nova 003 e provisiona/atualiza grants do usuário DML; o backend só inicia após sucesso. Nunca editar migração já aplicada. Retornar versão anterior não remove automaticamente schema/role.

`POSTGRES_USER`/`POSTGRES_PASSWORD` pertencem ao migrador, que é privilegiado e cria extensão/tabelas/papel. Só db e migrate recebem essa senha; backend recebe apenas URL com `POSTGRES_APP_USER`/`POSTGRES_APP_PASSWORD`. O papel da aplicação tem CONNECT, USAGE, DML nas tabelas de negócio/limites e USAGE/SELECT na sequência de revisões; sem permissão sobre schema_migrations ou DDL persistente. Não é isolamento contra o dono do banco. Não adotar papel pré-existente com privilégios/membros/objetos: provisionador recusa. Use banco dedicado; provisionamento revoga CREATE de PUBLIC no schema da aplicação. Tabelas futuras precisam de grant explícito no provisionador. Troca de senha deve ser coordenada com reinício das instâncias.

Execução sem Compose: no ambiente do migrador configure DATABASE_URL privilegiada, APP_DATABASE_USER e APP_DATABASE_PASSWORD e execute `python -m backend.migrate`. Em outro ambiente configure DATABASE_URL DML para bootstrap, API e limpeza. Não entregue a senha privilegiada ao processo da API. Teste de papéis em `backend/tests/test_provision.py` verifica DML permitido e negação de DDL/leitura/escrita de migrações.

## Limites compartilhados

Migração 003 adiciona `request_limits`. Cada consumo usa transação própria, UPSERT atômico e relógio do PostgreSQL; respostas de erro não desfazem contagem. Todas as instâncias **no mesmo banco/schema** compartilham limites; uma réplica com banco separado não compartilha. Subjects são hashes; linhas expiradas são removidas nas próximas requisições. Sem fallback em memória se banco falhar.

| Escopo | Limite por janela fixa de 60 s | Observação |
|---|---|---|
| Login | 5 tentativas por username | Sucesso limpa o contador; falhas/usuário inexistente contam antes do hash da senha; 6ª retorna 429 |
| API autenticada | 120 por usuário | Inclui leitura, foto, senha, revisão e tentativas de upload; não é por token |
| Novo upload | 20 por agricultor | Após autorização e deduplicação; replay não consome este limite, mas conta na API |
| Refresh de família identificada | 30 por usuário | Inclui tokens antigos identificados; mantém detecção de reuso e revogação |

429 inclui Retry-After: 60 (espera conservadora, não restante exato). Valores são escolhas operacionais de MVP, sem dimensionamento de produção. Username distribuído impede contorno por réplica, mas ataque com muitos nomes novos, tokens inválidos e endpoints públicos não tem limite global por IP neste MVP. Dados-api/cache também não têm limitador distribuído. Antes de publicação, impor limites de conexão/IP/corpo no gateway, orçamento/proteções contra abuso de provedores, monitorar cardinalidade/latência do banco e avaliar capacidade. Não confiar em X-Forwarded-For arbitrário; o Nginx atual substitui pelo endereço do cliente imediato. Não alegamos proteção DDoS.

## Limpeza de fotos órfãs

```sh
docker compose exec backend python -m backend.cleanup_photos
docker compose exec backend python -m backend.cleanup_photos --apply
```

Primeiro comando apenas inspeciona; segundo remove só hash.jpg sem referência em incidents e temporários `.upload-*`, mais antigos que 24 h. `--grace-hours` permite >=1 h. Outros arquivos, links simbólicos, fotos novas e fotos com qualquer referência são preservados. Saída CLI só tem modo/contagem, sem dados pessoais. Não apaga incidentes/revisões/fotos referenciadas nem define política de retenção. Não há agendamento: operador deve escolher rotina e monitorar falhas.

Upload mantém advisory lock compartilhado durante escrita/análise/commit. Limpeza obtém lock exclusivo e lê referências antes de remover; timeout de 5 s falha sem continuar se não conseguir. Novos uploads aguardam a limpeza. Em múltiplas instâncias, todas precisam usar **o mesmo banco e volume privado compartilhado**; diretórios incompatíveis, código antigo ou escritores fora desse protocolo não são coordenados. API não expõe diretório publicamente. Em falha parcial durante remoção, executar dry-run novamente; unlink não é transacional. Backup consistente de banco e fotos continua necessário.

## Modos e validação honesta

Demo: DATA_MODE=demo e VISION_MODE=simulated, sem chaves de provedor; rótulos sempre visíveis. O CI demonstra foto→análise simulada→snapshot→revisão pelo navegador com Nginx/PostGIS e identidade DML.

Live: configure no `.env` privado DATA_MODE=live, FIRMS_MAP_KEY, VISION_MODE=gemini, GEMINI_API_KEY e GEMINI_MODEL compatível; reinicie dados/backend. Nenhuma chave vai ao frontend. Use foto própria/autorizada, localização explícita e revise fonte/status/simulated/horários/avisos no detalhe. Para uma verificação válida, registre os resultados realmente observados: IA/modelo/prompt, duas fontes, snapshot persistido e revisão; indisponibilidade continua indisponibilidade e não deve ser ocultada. As verificações externas anteriores testaram separadamente imagem sintética e um ponto ambiental real. **Fluxo live completo com foto real não foi executado nesta fase; nenhuma acurácia foi medida.**

Checklist de preparação com dados pessoais em PRIVACIDADE-LGPD.md. HTTPS, backup/restauração, capacidade, monitoramento, política de retenção e atendimento a titulares exigem configuração/decisão do operador.
