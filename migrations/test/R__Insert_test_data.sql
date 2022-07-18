TRUNCATE table api.loan,
    api.collateral,
    api.stability_provider,
    api.usdh,
    api.staking_pool_state,
    api.stability_pool_state,
    api.metrics,
    api.borrowing_market_state,
    api.owner,
    api.token,
    api.cluster RESTART IDENTITY CASCADE;

INSERT INTO api.cluster (name)
values ('devnet'); --1
INSERT INTO api.cluster (name)
values ('mainnet-beta'); --2

INSERT INTO api.token (name)
VALUES ('BTC'); --1
INSERT INTO api.token (name)
VALUES ('SRM'); --2
INSERT INTO api.token (name)
VALUES ('ETH'); --3
INSERT INTO api.token (name)
VALUES ('SOL'); --4
INSERT INTO api.token (name)
VALUES ('FTT'); --5
INSERT INTO api.token (name)
VALUES ('RAY'); --6
INSERT INTO api.token (name)
VALUES ('mSOL'); --7
INSERT INTO api.token (name)
VALUES ('MSOL'); --8
INSERT INTO api.token (name)
VALUES ('daoSOL'); --9
INSERT INTO api.token (name)
VALUES ('STSOL'); --10
INSERT INTO api.token (name)
VALUES ('scnSOL'); --11
INSERT INTO api.token (name)
VALUES ('wstETH'); --12
INSERT INTO api.token (name)
VALUES ('LDO'); --13

insert into api.owner (pubkey, cluster_id)
VALUES ('test-owner-pubkey', 1);

-- insert a loan with: 100 USDH debt, total collateral $200, CR 50%, LTV 50%, with only 1 collateral: 10 STSOL with price: $20
-- this loan should be eligible for LDO rewards
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('eligibleOneCollateral8kzX1xg6PFN2ZYExxRyZUaF', 100, '2020-01-15 10:00:00.000+00', 200, 50, 50, 0, 1, 545,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (10, 0, 20, 10, 1);
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('eligibleOneCollateral8kzX1xg6PFN2ZYExxRyZUaF', 100, '2020-01-16 10:00:00.000+00', 200, 50, 50, 0, 1, 545,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (10, 0, 20, 10, 2);
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('eligibleOneCollateral8kzX1xg6PFN2ZYExxRyZUaF', 100, '2020-01-17 10:00:00.000+00', 200, 50, 50, 0, 1, 545,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (10, 0, 20, 10, 3);

-- insert a loan with: 70 USDH debt, total collateral $100, CR 70%, LTV 30%, with only 1 collateral: 5 STSOL with price: $20
-- this loan should NOT be eligible for LDO rewards
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('notEligibleOneCollateralX1xg6PFN2ZYExxRyZUaF', 70, '2020-01-15 10:00:00.000+00', 100, 70, 30, 0, 1, 545,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (5, 0, 20, 10, 4);
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('notEligibleOneCollateralX1xg6PFN2ZYExxRyZUaF', 70, '2020-01-16 10:00:00.000+00', 100, 70, 30, 0, 1, 545,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (5, 0, 20, 10, 5);
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('notEligibleOneCollateralX1xg6PFN2ZYExxRyZUaF', 70, '2020-01-17 10:00:00.000+00', 100, 70, 30, 0, 1, 545,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (5, 0, 20, 10, 6);

-- insert a loan with: 5,000 USDH debt, total collateral $10,000, CR 50%, LTV 50%, with multiple collateral:
-- - 10 STSOL with price: $250 -> $2500
-- - 1 wstETH with price: $2500 -> $2500
-- - 50 SOL with price: $100 -> $5000
-- this loan should be eligible for LDO rewards
INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('eligibleMultiCollateralX11xg6PFN2ZYExxRyZUaF', 5000, '2019-01-15 06:00:00.000+00', 10000, 50, 50, 0, 1, 200,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (10, 0, 250, 10, 7);
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (1, 0, 2500, 12, 7);
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (50, 0, 100, 4, 7);

INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('eligibleMultiCollateralX11xg6PFN2ZYExxRyZUaF', 5000, '2019-01-16 17:00:00.000+00', 10000, 50, 50, 0, 1, 200,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (10, 0, 250, 10, 8);
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (1, 0, 2500, 12, 8);
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (50, 0, 100, 4, 8);

INSERT INTO api.loan (user_metadata_pubkey, usdh_debt, created_on, total_collateral_value, collateral_ratio, loan_to_value, version, status, user_id,
                      borrowing_market_state_pubkey, owner_id, raw_json)
VALUES ('eligibleMultiCollateralX11xg6PFN2ZYExxRyZUaF', 5000, '2019-01-16 18:00:00.000+00', 10000, 50, 50, 0, 1, 200,
        'FqkHHpETrpfgcA5SeH7PKKFDLGWM4tM7ZV31HfutTXNV', 1, '{}');
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (10, 0, 250, 10, 9);
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (1, 0, 2500, 12, 9);
INSERT INTO api.collateral (deposited_quantity, inactive_quantity, price, token_id, loan_id)
VALUES (50, 0, 100, 4, 9);
