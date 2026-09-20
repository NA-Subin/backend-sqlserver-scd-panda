-- Auto-generated from schema-manifest.json - creates every table this
-- backend reads/writes, column-for-column identical to the Postgres schema
-- (same table/column names, semantically equivalent types). Run this once
-- against a fresh test database before pointing backend-mssql at it.
--
-- NVARCHAR(MAX) is used for every text/JSON column rather than a length cap -
-- several original Firebase fields (Report history, Address blobs, long
-- free-text notes) can be large, and matching Postgres's unbounded TEXT/JSONB
-- behavior avoids a truncation surprise mid-test.

IF OBJECT_ID('dbo.banks', 'U') IS NULL
CREATE TABLE [banks] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [bank] NVARCHAR(MAX) NULL,
  [bank_id] NVARCHAR(MAX) NULL,
  [bank_name] NVARCHAR(MAX) NULL,
  [bank_short_name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.company', 'U') IS NULL
CREATE TABLE [company] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [card_id] NVARCHAR(MAX) NULL,
  [date_start] NVARCHAR(MAX) NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [phone] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [lat_2] NVARCHAR(MAX) NULL,
  [lng_2] NVARCHAR(MAX) NULL,
  [history] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.company_history', 'U') IS NULL
CREATE TABLE [company_history] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [name] NVARCHAR(MAX) NULL,
  [card_id] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [date_start] NVARCHAR(MAX) NULL,
  [date_end] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.companypayment', 'U') IS NULL
CREATE TABLE [companypayment] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.customer', 'U') IS NULL
CREATE TABLE [customer] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL,
  [credit] NVARCHAR(MAX) NULL,
  [credit_time] NVARCHAR(MAX) NULL,
  [debt] NVARCHAR(MAX) NULL,
  [id_card] NVARCHAR(MAX) NULL,
  [phone] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.customers', 'U') IS NULL
CREATE TABLE [customers] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [code_id] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [company_name_2] NVARCHAR(MAX) NULL,
  [credit_time] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [phone] NVARCHAR(MAX) NULL,
  [rate1] NVARCHAR(MAX) NULL,
  [rate2] NVARCHAR(MAX) NULL,
  [rate3] NVARCHAR(MAX) NULL,
  [registration] NVARCHAR(MAX) NULL,
  [registration_check] BIT NULL,
  [status] NVARCHAR(MAX) NULL,
  [status_company] NVARCHAR(MAX) NULL,
  [tickets_name] NVARCHAR(MAX) NULL,
  [type] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL,
  [category] NVARCHAR(MAX) NULL,
  [price] NVARCHAR(MAX) NULL,
  [bill] NVARCHAR(MAX) NULL,
  [system_status] NVARCHAR(MAX) NULL,
  [last_name] NVARCHAR(MAX) NULL,
  [short_name] NVARCHAR(MAX) NULL,
  [credit] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.deductibleincome', 'U') IS NULL
CREATE TABLE [deductibleincome] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [status_data] NVARCHAR(MAX) NULL,
  [type] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.depot_gas_stations', 'U') IS NULL
CREATE TABLE [depot_gas_stations] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [cbp] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [oil_well_number] FLOAT NULL,
  [products] NVARCHAR(MAX) NULL,
  [report] NVARCHAR(MAX) NULL,
  [short_name] NVARCHAR(MAX) NULL,
  [stock] UNIQUEIDENTIFIER NULL,
  [stock_name] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL,
  [check_truck] BIT NULL,
  [backyard] NVARCHAR(MAX) NULL,
  [gasstation] BIT NULL
);
GO

IF OBJECT_ID('dbo.depot_oils', 'U') IS NULL
CREATE TABLE [depot_oils] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [zone] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.depot_stock', 'U') IS NULL
CREATE TABLE [depot_stock] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [products] NVARCHAR(MAX) NULL,
  [volume] FLOAT NULL,
  [id] FLOAT NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.employee_creditors', 'U') IS NULL
CREATE TABLE [employee_creditors] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [credit] NVARCHAR(MAX) NULL,
  [id_card] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [phone] NVARCHAR(MAX) NULL,
  [type] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.employee_drivers', 'U') IS NULL
CREATE TABLE [employee_drivers] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [bank_id] NVARCHAR(MAX) NULL,
  [bank_name] NVARCHAR(MAX) NULL,
  [deposit] NVARCHAR(MAX) NULL,
  [driving_license] NVARCHAR(MAX) NULL,
  [driving_license_expiration] NVARCHAR(MAX) NULL,
  [driving_license_picture] NVARCHAR(MAX) NULL,
  [id_card] NVARCHAR(MAX) NULL,
  [loan] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [password] NVARCHAR(MAX) NULL,
  [phone] NVARCHAR(MAX) NULL,
  [point_cost] NVARCHAR(MAX) NULL,
  [position] UNIQUEIDENTIFIER NULL,
  [position_name] NVARCHAR(MAX) NULL,
  [registration] UNIQUEIDENTIFIER NULL,
  [registration_name] NVARCHAR(MAX) NULL,
  [registration_small] UNIQUEIDENTIFIER NULL,
  [registration_small_name] NVARCHAR(MAX) NULL,
  [salary] NVARCHAR(MAX) NULL,
  [security] NVARCHAR(MAX) NULL,
  [telephone_bill] NVARCHAR(MAX) NULL,
  [trip_cost] NVARCHAR(MAX) NULL,
  [truck_type] NVARCHAR(MAX) NULL,
  [user] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [phone-] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.employee_officers', 'U') IS NULL
CREATE TABLE [employee_officers] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [password] NVARCHAR(MAX) NULL,
  [phone] NVARCHAR(MAX) NULL,
  [position] UNIQUEIDENTIFIER NULL,
  [position_name] NVARCHAR(MAX) NULL,
  [rights] NVARCHAR(MAX) NULL,
  [user] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [gas_station] UNIQUEIDENTIFIER NULL,
  [gas_station_name] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.expenseitems', 'U') IS NULL
CREATE TABLE [expenseitems] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [type] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.inspection', 'U') IS NULL
CREATE TABLE [inspection] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [air] NVARCHAR(MAX) NULL,
  [brake] NVARCHAR(MAX) NULL,
  [dates] NVARCHAR(MAX) NULL,
  [electricity] NVARCHAR(MAX) NULL,
  [employee] UNIQUEIDENTIFIER NULL,
  [employee_name] NVARCHAR(MAX) NULL,
  [gasoline] NVARCHAR(MAX) NULL,
  [noise] NVARCHAR(MAX) NULL,
  [oils] NVARCHAR(MAX) NULL,
  [reg_head] NVARCHAR(MAX) NULL,
  [reg_tail] NVARCHAR(MAX) NULL,
  [type] NVARCHAR(MAX) NULL,
  [water] NVARCHAR(MAX) NULL,
  [id] NVARCHAR(MAX) NULL,
  [reg_head_id] NVARCHAR(MAX) NULL,
  [employee_2] UNIQUEIDENTIFIER NULL,
  [employee_2_name] NVARCHAR(MAX) NULL,
  [trip] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.invoice', 'U') IS NULL
CREATE TABLE [invoice] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [date_start] NVARCHAR(MAX) NULL,
  [number] NVARCHAR(MAX) NULL,
  [ticket_name] UNIQUEIDENTIFIER NULL,
  [ticket_name_name] NVARCHAR(MAX) NULL,
  [ticket_no] NVARCHAR(MAX) NULL,
  [ticket_type] NVARCHAR(MAX) NULL,
  [transport] UNIQUEIDENTIFIER NULL,
  [transport_name] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.order', 'U') IS NULL
CREATE TABLE [order] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [bill] NVARCHAR(MAX) NULL,
  [code_id] NVARCHAR(MAX) NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [credit_time] NVARCHAR(MAX) NULL,
  [customer_type] NVARCHAR(MAX) NULL,
  [date] NVARCHAR(MAX) NULL,
  [driver] UNIQUEIDENTIFIER NULL,
  [driver_name] NVARCHAR(MAX) NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL,
  [no] FLOAT NULL,
  [product] NVARCHAR(MAX) NULL,
  [rate1] NVARCHAR(MAX) NULL,
  [rate2] NVARCHAR(MAX) NULL,
  [rate3] NVARCHAR(MAX) NULL,
  [registration] UNIQUEIDENTIFIER NULL,
  [registration_name] NVARCHAR(MAX) NULL,
  [ticket_name] UNIQUEIDENTIFIER NULL,
  [ticket_name_name] NVARCHAR(MAX) NULL,
  [trip] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [status] NVARCHAR(MAX) NULL,
  [last_name] NVARCHAR(MAX) NULL,
  [short_name] NVARCHAR(MAX) NULL,
  [rate] FLOAT NULL,
  [travel] FLOAT NULL,
  [file_path] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.positions', 'U') IS NULL
CREATE TABLE [positions] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [basic_data] FLOAT NULL,
  [big_truck_data] FLOAT NULL,
  [driver_data] FLOAT NULL,
  [financial_data] FLOAT NULL,
  [gas_station_data] FLOAT NULL,
  [name] NVARCHAR(MAX) NULL,
  [opreration_data] FLOAT NULL,
  [report_data] FLOAT NULL,
  [small_truck_data] FLOAT NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.products', 'U') IS NULL
CREATE TABLE [products] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [product_name] NVARCHAR(MAX) NULL,
  [sg] FLOAT NULL,
  [name_th] NVARCHAR(MAX) NULL,
  [is_active] BIT NULL
);
GO

IF OBJECT_ID('dbo.quotation', 'U') IS NULL
CREATE TABLE [quotation] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [customer] UNIQUEIDENTIFIER NULL,
  [customer_name] NVARCHAR(MAX) NULL,
  [date] NVARCHAR(MAX) NULL,
  [date_start] NVARCHAR(MAX) NULL,
  [employee] UNIQUEIDENTIFIER NULL,
  [employee_name] NVARCHAR(MAX) NULL,
  [note] NVARCHAR(MAX) NULL,
  [product] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [truck] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [date_delivery] NVARCHAR(MAX) NULL,
  [selected_index] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.report_financial', 'U') IS NULL
CREATE TABLE [report_financial] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [date] NVARCHAR(MAX) NULL,
  [driver] UNIQUEIDENTIFIER NULL,
  [driver_name] NVARCHAR(MAX) NULL,
  [money] NVARCHAR(MAX) NULL,
  [name] UNIQUEIDENTIFIER NULL,
  [name_name] NVARCHAR(MAX) NULL,
  [note] NVARCHAR(MAX) NULL,
  [period] FLOAT NULL,
  [reg_head] UNIQUEIDENTIFIER NULL,
  [reg_head_name] NVARCHAR(MAX) NULL,
  [reg_tail] UNIQUEIDENTIFIER NULL,
  [reg_tail_name] NVARCHAR(MAX) NULL,
  [short_name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [type] NVARCHAR(MAX) NULL,
  [vehicle_type] NVARCHAR(MAX) NULL,
  [year] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.report_invoice', 'U') IS NULL
CREATE TABLE [report_invoice] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [bank] UNIQUEIDENTIFIER NULL,
  [bank_name] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [details] NVARCHAR(MAX) NULL,
  [invoice_id] NVARCHAR(MAX) NULL,
  [note] NVARCHAR(MAX) NULL,
  [price] NVARCHAR(MAX) NULL,
  [registration_head] UNIQUEIDENTIFIER NULL,
  [registration_head_name] NVARCHAR(MAX) NULL,
  [registration_tail] UNIQUEIDENTIFIER NULL,
  [registration_tail_name] NVARCHAR(MAX) NULL,
  [registration_small] UNIQUEIDENTIFIER NULL,
  [registration_small_name] NVARCHAR(MAX) NULL,
  [selected_date_invoice] NVARCHAR(MAX) NULL,
  [selected_date_transfer] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [total] FLOAT NULL,
  [truck_type] NVARCHAR(MAX) NULL,
  [vat] FLOAT NULL,
  [id] NVARCHAR(MAX) NULL,
  [path] NVARCHAR(MAX) NULL,
  [group] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.tickets', 'U') IS NULL
CREATE TABLE [tickets] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [address] NVARCHAR(MAX) NULL,
  [bill] NVARCHAR(MAX) NULL,
  [code_id] NVARCHAR(MAX) NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [credit_time] NVARCHAR(MAX) NULL,
  [customer_type] NVARCHAR(MAX) NULL,
  [date] NVARCHAR(MAX) NULL,
  [driver] UNIQUEIDENTIFIER NULL,
  [driver_name] NVARCHAR(MAX) NULL,
  [lat] NVARCHAR(MAX) NULL,
  [lng] NVARCHAR(MAX) NULL,
  [no] FLOAT NULL,
  [order_id] NVARCHAR(MAX) NULL,
  [product] NVARCHAR(MAX) NULL,
  [rate1] NVARCHAR(MAX) NULL,
  [rate2] NVARCHAR(MAX) NULL,
  [rate3] NVARCHAR(MAX) NULL,
  [registration] UNIQUEIDENTIFIER NULL,
  [registration_name] NVARCHAR(MAX) NULL,
  [ticket_name] UNIQUEIDENTIFIER NULL,
  [ticket_name_name] NVARCHAR(MAX) NULL,
  [trip] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [status] NVARCHAR(MAX) NULL,
  [rate] FLOAT NULL,
  [travel] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.transfermoney', 'U') IS NULL
CREATE TABLE [transfermoney] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [bank_name] UNIQUEIDENTIFIER NULL,
  [bank_name_name] NVARCHAR(MAX) NULL,
  [code] NVARCHAR(MAX) NULL,
  [date_start] NVARCHAR(MAX) NULL,
  [incoming_money] NVARCHAR(MAX) NULL,
  [note] NVARCHAR(MAX) NULL,
  [number] NVARCHAR(MAX) NULL,
  [ticket_name] UNIQUEIDENTIFIER NULL,
  [ticket_name_name] NVARCHAR(MAX) NULL,
  [ticket_no] FLOAT NULL,
  [ticket_type] NVARCHAR(MAX) NULL,
  [transport] UNIQUEIDENTIFIER NULL,
  [transport_name] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [status] NVARCHAR(MAX) NULL,
  [month] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.trip', 'U') IS NULL
CREATE TABLE [trip] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [cost_trip] FLOAT NULL,
  [date_delivery] NVARCHAR(MAX) NULL,
  [date_receive] NVARCHAR(MAX) NULL,
  [date_start] NVARCHAR(MAX) NULL,
  [depot] NVARCHAR(MAX) NULL,
  [driver] UNIQUEIDENTIFIER NULL,
  [driver_name] NVARCHAR(MAX) NULL,
  [order1] NVARCHAR(MAX) NULL,
  [registration] UNIQUEIDENTIFIER NULL,
  [registration_name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [status_trip] NVARCHAR(MAX) NULL,
  [ticket1] NVARCHAR(MAX) NULL,
  [ticket2] NVARCHAR(MAX) NULL,
  [total_weight] FLOAT NULL,
  [truck_type] NVARCHAR(MAX) NULL,
  [weight_high] NVARCHAR(MAX) NULL,
  [weight_low] NVARCHAR(MAX) NULL,
  [weight_truck] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [order2] NVARCHAR(MAX) NULL,
  [order3] NVARCHAR(MAX) NULL,
  [order4] NVARCHAR(MAX) NULL,
  [order5] NVARCHAR(MAX) NULL,
  [ticket3] NVARCHAR(MAX) NULL,
  [ticket4] NVARCHAR(MAX) NULL,
  [date_end] NVARCHAR(MAX) NULL,
  [order6] NVARCHAR(MAX) NULL,
  [order7] NVARCHAR(MAX) NULL,
  [order8] NVARCHAR(MAX) NULL,
  [ticket5] NVARCHAR(MAX) NULL,
  [ticket6] NVARCHAR(MAX) NULL,
  [weight_oil] FLOAT NULL,
  [daet_end] NVARCHAR(MAX) NULL,
  [order1_2] NVARCHAR(MAX) NULL,
  [ticket7] NVARCHAR(MAX) NULL,
  [ticket8] NVARCHAR(MAX) NULL,
  [ticket10] NVARCHAR(MAX) NULL,
  [ticket9] NVARCHAR(MAX) NULL,
  [ticket11] NVARCHAR(MAX) NULL,
  [ticket12] NVARCHAR(MAX) NULL,
  [ticket13] NVARCHAR(MAX) NULL,
  [ticket14] NVARCHAR(MAX) NULL,
  [tickets1] NVARCHAR(MAX) NULL,
  [tickets2] NVARCHAR(MAX) NULL,
  [ticket15] NVARCHAR(MAX) NULL,
  [ticket16] NVARCHAR(MAX) NULL,
  [ticket17] NVARCHAR(MAX) NULL,
  [ticket18] NVARCHAR(MAX) NULL,
  [ticket19] NVARCHAR(MAX) NULL,
  [ticket20] NVARCHAR(MAX) NULL,
  [ticket21] NVARCHAR(MAX) NULL,
  [ticket22] NVARCHAR(MAX) NULL,
  [ticket23] NVARCHAR(MAX) NULL,
  [ticket24] NVARCHAR(MAX) NULL,
  [ticket25] NVARCHAR(MAX) NULL,
  [ticket26] NVARCHAR(MAX) NULL,
  [ticket27] NVARCHAR(MAX) NULL,
  [order9] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.truck_registration', 'U') IS NULL
CREATE TABLE [truck_registration] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [act] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [date_end_insurance] NVARCHAR(MAX) NULL,
  [date_end_tax] NVARCHAR(MAX) NULL,
  [driver] UNIQUEIDENTIFIER NULL,
  [driver_name] NVARCHAR(MAX) NULL,
  [insurance] NVARCHAR(MAX) NULL,
  [path] NVARCHAR(MAX) NULL,
  [reg_head] NVARCHAR(MAX) NULL,
  [reg_tail] UNIQUEIDENTIFIER NULL,
  [reg_tail_name] NVARCHAR(MAX) NULL,
  [repair_truck] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [total_weight] FLOAT NULL,
  [veh_expiration_date] NVARCHAR(MAX) NULL,
  [veh_picture] NVARCHAR(MAX) NULL,
  [vehicle_registration] NVARCHAR(MAX) NULL,
  [weight] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

IF OBJECT_ID('dbo.truck_registration_tail', 'U') IS NULL
CREATE TABLE [truck_registration_tail] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [cap] FLOAT NULL,
  [cap1] NVARCHAR(MAX) NULL,
  [cap2] NVARCHAR(MAX) NULL,
  [cap3] NVARCHAR(MAX) NULL,
  [cap4] NVARCHAR(MAX) NULL,
  [cap5] NVARCHAR(MAX) NULL,
  [cap6] NVARCHAR(MAX) NULL,
  [cap7] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [date_end_insurance] NVARCHAR(MAX) NULL,
  [date_end_tax] NVARCHAR(MAX) NULL,
  [driver] NVARCHAR(MAX) NULL,
  [insurance] NVARCHAR(MAX) NULL,
  [reg_tail] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [veh_picture] NVARCHAR(MAX) NULL,
  [vehicle_registration] NVARCHAR(MAX) NULL,
  [weight] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [cap8] NVARCHAR(MAX) NULL,
  [veh_expiration_date] NVARCHAR(MAX) NULL,
  [path] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.truck_small', 'U') IS NULL
CREATE TABLE [truck_small] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [act] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [date_end_insurance] NVARCHAR(MAX) NULL,
  [date_end_tax] NVARCHAR(MAX) NULL,
  [driver] UNIQUEIDENTIFIER NULL,
  [driver_name] NVARCHAR(MAX) NULL,
  [insurance] NVARCHAR(MAX) NULL,
  [reg_head] NVARCHAR(MAX) NULL,
  [repair_truck] NVARCHAR(MAX) NULL,
  [short_name] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [veh_expiration_date] NVARCHAR(MAX) NULL,
  [veh_picture] NVARCHAR(MAX) NULL,
  [vehicle_registration] NVARCHAR(MAX) NULL,
  [weight] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL,
  [path] NVARCHAR(MAX) NULL,
  [status_truck] NVARCHAR(MAX) NULL
);
GO

IF OBJECT_ID('dbo.truck_transport', 'U') IS NULL
CREATE TABLE [truck_transport] (
  [uuid] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  [row_key] NVARCHAR(MAX) NULL,
  [company] UNIQUEIDENTIFIER NULL,
  [company_name] NVARCHAR(MAX) NULL,
  [name] NVARCHAR(MAX) NULL,
  [pass_word] NVARCHAR(MAX) NULL,
  [registration] NVARCHAR(MAX) NULL,
  [repair_truck] NVARCHAR(MAX) NULL,
  [status] NVARCHAR(MAX) NULL,
  [truck_type] NVARCHAR(MAX) NULL,
  [user_id] NVARCHAR(MAX) NULL,
  [weight] NVARCHAR(MAX) NULL,
  [id] FLOAT NULL
);
GO

