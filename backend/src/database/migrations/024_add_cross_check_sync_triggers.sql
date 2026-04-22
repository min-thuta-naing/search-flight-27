-- Migration: Add synchronization triggers for cross-check airport flags
-- This ensures the is_cross_check_enabled flag matches current flight path data.

CREATE OR REPLACE FUNCTION sync_cross_check_flag(airport_code TEXT)
RETURNS VOID AS $$
BEGIN
    IF airport_code IS NULL OR airport_code = '' THEN
        RETURN;
    END IF;

    UPDATE airports
    SET is_cross_check_enabled = (
        EXISTS (
            SELECT 1 FROM departure_flight_paths WHERE dep_airport = UPPER(airport_code)
        )
        OR EXISTS (
            SELECT 1 FROM arrival_flight_paths WHERE arr_airport = UPPER(airport_code)
        )
    )
    WHERE code = UPPER(airport_code);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cross_check_airport_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM sync_cross_check_flag(NEW.dep_airport);
        PERFORM sync_cross_check_flag(NEW.arr_airport);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.dep_airport IS DISTINCT FROM NEW.dep_airport THEN
            PERFORM sync_cross_check_flag(OLD.dep_airport);
            PERFORM sync_cross_check_flag(NEW.dep_airport);
        END IF;
        IF OLD.arr_airport IS DISTINCT FROM NEW.arr_airport THEN
            PERFORM sync_cross_check_flag(OLD.arr_airport);
            PERFORM sync_cross_check_flag(NEW.arr_airport);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM sync_cross_check_flag(OLD.dep_airport);
        PERFORM sync_cross_check_flag(OLD.arr_airport);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enable_cross_check_departure ON departure_flight_paths;
DROP TRIGGER IF EXISTS trigger_enable_cross_check_arrival ON arrival_flight_paths;
DROP TRIGGER IF EXISTS trigger_enable_cross_check_departure_update ON departure_flight_paths;
DROP TRIGGER IF EXISTS trigger_enable_cross_check_arrival_update ON arrival_flight_paths;

CREATE TRIGGER trigger_sync_cross_check_departure
    AFTER INSERT OR UPDATE OR DELETE ON departure_flight_paths
    FOR EACH ROW EXECUTE FUNCTION cross_check_airport_trigger();

CREATE TRIGGER trigger_sync_cross_check_arrival
    AFTER INSERT OR UPDATE OR DELETE ON arrival_flight_paths
    FOR EACH ROW EXECUTE FUNCTION cross_check_airport_trigger();
