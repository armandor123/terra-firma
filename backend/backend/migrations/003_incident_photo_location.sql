ALTER TABLE incidents
    DROP CONSTRAINT incidents_location_source_check,
    DROP CONSTRAINT incidents_check,
    ADD CONSTRAINT incidents_location_source_check
        CHECK (location_source IN ('photo_exif','gps','manual','unavailable')),
    ADD CONSTRAINT incidents_location_coordinates_check
        CHECK (
            (location_source='unavailable' AND latitude IS NULL AND longitude IS NULL)
            OR (location_source IN ('photo_exif','gps','manual') AND latitude IS NOT NULL
                AND longitude IS NOT NULL AND location_authorized)
        );
