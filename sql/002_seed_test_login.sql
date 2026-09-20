-- Minimal seed data so you can actually log in against a freshly-created
-- test database (via /api/auth/login through backend-mssql, or the
-- frontend). Safe to re-run - it's a no-op once the row already exists.
--
-- Login: user = testadmin / password = test1234
--
-- NOTE on rights: the live Postgres `positions` table currently has NO
-- "admin_data" column at all (confirmed against the real database - the
-- sql/add_admin_position_flag.sql migration in the Postgres backend repo
-- was written but never actually applied there), so nobody in the real
-- system can hold the AdminData right today either. This seed grants every
-- OTHER right (BasicData/BigTruckData/DriverData/FinancialData/
-- GasStationData/OprerationData/ReportData/SmallTruckData) so you can
-- exercise the CRUD/gas-station-reports endpoints end-to-end; the handful
-- of admin-only routes (creating/editing `positions`/`company`/
-- `company_history`) will still 403 for this account, matching current
-- real-system behavior. If you need to test those too, add an admin_data
-- column here and to schema-manifest.json/positions.AdminData together.

DECLARE @positionId UNIQUEIDENTIFIER = 'a1b2c3d4-e5f6-4a1b-8c2d-000000000001';
DECLARE @officerId UNIQUEIDENTIFIER = 'a1b2c3d4-e5f6-4a1b-8c2d-000000000002';

IF NOT EXISTS (SELECT 1 FROM [positions] WHERE [uuid] = @positionId)
INSERT INTO [positions] ([uuid], [row_key], [name], [basic_data], [big_truck_data], [driver_data], [financial_data], [gas_station_data], [opreration_data], [report_data], [small_truck_data], [id])
VALUES (@positionId, CONVERT(NVARCHAR(36), @positionId), N'Test Admin (seed)', 1, 1, 1, 1, 1, 1, 1, 1, 9999);

IF NOT EXISTS (SELECT 1 FROM [employee_officers] WHERE [uuid] = @officerId)
INSERT INTO [employee_officers] ([uuid], [row_key], [name], [password], [phone], [position], [position_name], [user], [id])
VALUES (
  @officerId,
  CONVERT(NVARCHAR(36), @officerId),
  N'Test Admin',
  N'$2a$10$tbkJHcKJ4XdWIItx6/oKSuzr39/Qs1ZQ5jHEhjwfylYLcfrbJiQj.', -- bcrypt hash of "test1234"
  N'0000000000',
  @positionId,
  N'Test Admin (seed)',
  N'testadmin',
  9999
);
GO
