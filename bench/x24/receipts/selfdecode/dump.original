-- Northgate Vault schema dump
CREATE TABLE documents (
  id            bigserial PRIMARY KEY,
  workspace_id  bigint NOT NULL REFERENCES workspaces(id),
  folder_id     bigint REFERENCES folders(id),
  policy_id     bigint REFERENCES retention_policies(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  disposed_at   timestamptz,
  content_hash  bytea NOT NULL
);

INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (100, 2000, 1, '2026-01-01 00:00:00+00', decode('00000000000000000000000000000000','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (101, 2001, 2, '2026-02-02 01:07:00+00', decode('000000003ade68b100000000075bcd15','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (102, 2002, 3, '2026-03-03 02:14:00+00', decode('0000000075bcd162000000000eb79a2a','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (103, 2003, 4, '2026-04-04 03:21:00+00', decode('00000000b09b3a13000000001613673f','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (104, 2004, 5, '2026-05-05 04:28:00+00', decode('00000000eb79a2c4000000001d6f3454','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (105, 2005, 1, '2026-06-06 05:35:00+00', decode('0000000126580b750000000024cb0169','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (106, 2006, 2, '2026-07-07 06:42:00+00', decode('0000000161367426000000002c26ce7e','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (100, 2007, 3, '2026-08-08 07:49:00+00', decode('000000019c14dcd70000000033829b93','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (101, 2008, 4, '2026-09-09 08:56:00+00', decode('00000001d6f34588000000003ade68a8','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (102, 2009, 5, '2026-01-10 09:03:00+00', decode('0000000211d1ae3900000000423a35bd','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (103, 2010, 1, '2026-02-11 00:10:00+00', decode('000000024cb016ea00000000499602d2','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (104, 2011, 2, '2026-03-12 01:17:00+00', decode('00000002878e7f9b0000000050f1cfe7','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (105, 2012, 3, '2026-04-13 02:24:00+00', decode('00000002c26ce84c00000000584d9cfc','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (106, 2013, 4, '2026-05-14 03:31:00+00', decode('00000002fd4b50fd000000005fa96a11','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (100, 2014, 5, '2026-06-15 04:38:00+00', decode('000000033829b9ae0000000067053726','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (101, 2015, 1, '2026-07-16 05:45:00+00', decode('000000037308225f000000006e61043b','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (102, 2016, 2, '2026-08-17 06:52:00+00', decode('00000003ade68b100000000075bcd150','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (103, 2017, 3, '2026-09-18 07:59:00+00', decode('00000003e8c4f3c1000000007d189e65','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (104, 2018, 4, '2026-01-19 08:06:00+00', decode('0000000423a35c720000000084746b7a','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (105, 2019, 5, '2026-02-20 09:13:00+00', decode('000000045e81c523000000008bd0388f','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (106, 2020, 1, '2026-03-21 00:20:00+00', decode('0000000499602dd400000000932c05a4','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (100, 2021, 2, '2026-04-22 01:27:00+00', decode('00000004d43e9685000000009a87d2b9','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (101, 2022, 3, '2026-05-23 02:34:00+00', decode('000000050f1cff3600000000a1e39fce','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (102, 2023, 4, '2026-06-24 03:41:00+00', decode('0000000549fb67e700000000a93f6ce3','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (103, 2024, 5, '2026-07-25 04:48:00+00', decode('0000000584d9d09800000000b09b39f8','hex'));
INSERT INTO documents (workspace_id, folder_id, policy_id, created_at, content_hash) VALUES (104, 2025, 1, '2026-08-26 05:55:00+00', decode('00000005bfb8394900000000b7f7070d','hex'));
