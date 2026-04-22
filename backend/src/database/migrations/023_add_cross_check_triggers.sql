-- Function to automatically enable cross-check for airports when flight data is added
CREATE OR REPLACE FUNCTION enable_cross_check_for_airport()
RETURNS TRIGGER AS $$
BEGIN
    -- Enable cross-check for the departure airport
    IF NEW.dep_airport IS NOT NULL AND NEW.dep_airport != '' THEN
        UPDATE airports
        SET is_cross_check_enabled = true
        WHERE code = UPPER(NEW.dep_airport);
    END IF;

    -- Enable cross-check for the arrival airport
    IF NEW.arr_airport IS NOT NULL AND NEW.arr_airport != '' THEN
        UPDATE airports
        SET is_cross_check_enabled = true
        WHERE code = UPPER(NEW.arr_airport);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for departure_flight_paths
CREATE OR REPLACE TRIGGER trigger_enable_cross_check_departure
    AFTER INSERT ON departure_flight_paths
    FOR EACH ROW EXECUTE FUNCTION enable_cross_check_for_airport();

-- Trigger for arrival_flight_paths
CREATE OR REPLACE TRIGGER trigger_enable_cross_check_arrival
    AFTER INSERT ON arrival_flight_paths
    FOR EACH ROW EXECUTE FUNCTION enable_cross_check_for_airport();

-- Also create triggers for UPDATE operations in case airport codes change
CREATE OR REPLACE TRIGGER trigger_enable_cross_check_departure_update
    AFTER UPDATE ON departure_flight_paths
    FOR EACH ROW EXECUTE FUNCTION enable_cross_check_for_airport();

CREATE OR REPLACE TRIGGER trigger_enable_cross_check_arrival_update
    AFTER UPDATE ON arrival_flight_paths
    FOR EACH ROW EXECUTE FUNCTION enable_cross_check_for_airport();
