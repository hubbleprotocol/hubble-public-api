/*
  Summary:
      Get LIDO rewards eligible Hubble loans for the specified time interval.
      For a Hubble loan to be eligible for LIDO rewards it must have at least 40% of the total collateral value in STSOL or wstETH tokens.
  Arguments:
      - start_date: timestamp with time zone that specifies the inclusive start of the time interval to check for eligible loans
      - end_date: timestamp with time zone that specifies the exclusive end of the time interval to check for eligible loans
      - cluster_name: solana cluster name (devnet, mainnet-beta,...)
  Returns:
      - Table with rows with columns user_metadata_pubkey (loan identifier) and days_eligible.
  Example:
      - SELECT * FROM api.get_lido_eligible_loans('2022-06-20', '2022-07-01', 'mainnet-beta');
 */
CREATE FUNCTION api.get_lido_eligible_loans(start_date timestamp with time zone, end_date timestamp with time zone, cluster_name text)
    RETURNS TABLE
            (
                user_metadata_pubkey text,
                days_eligible        numeric
            )
AS
$func$
BEGIN
    RETURN QUERY
        select res.user_metadata_pubkey, res.days_eligible
        from (select res.user_metadata_pubkey,
                     res.token_id,
                     (percentile_cont(0.50) within group (order by res.median_coll_price)
                         * percentile_cont(0.50) within group (order by res.median_coll_quantity))
                         / percentile_cont(0.50) within group (order by res.median_total_coll_value) as median_coll_percent,
                     count(res.user_metadata_pubkey)::numeric                                        as days_eligible,
                     percentile_cont(0.50) within group (order by res.median_usdh_debt)
              from (select date_trunc('day', l.created_on)                                        as day,
                           l.user_metadata_pubkey,
                           coll.token_id,
                           percentile_cont(0.50) within group (order by coll.price)               as median_coll_price,
                           percentile_cont(0.50) within group (order by coll.deposited_quantity)  as median_coll_quantity,
                           percentile_cont(0.50) within group (order by l.total_collateral_value) as median_total_coll_value,
                           percentile_cont(0.50) within group (order by l.usdh_debt)              as median_usdh_debt
                    from api.loan l
                             join api.collateral coll
                                  on l.id = coll.loan_id
                             join api.token tok on coll.token_id = tok.id
                             join api.owner o on o.id = l.owner_id
                             join api.cluster clus on clus.id = o.cluster_id
                    where (tok.name = 'STSOL'
                        or tok.name = 'wstETH')
                      and clus.name = lower(cluster_name)
                      and coll.deposited_quantity > 0
                      and l.created_on >= start_date
                      and l.created_on <= end_date
                    group by 1, 2, 3) res
              group by 1, 2) res
        group by 1, 2
        having sum(median_coll_percent) >= 0.4;
END
$func$ LANGUAGE plpgsql;


/*
  Summary:
      Get all LIDO eligible loans with USDH debt for each day (LDO rewards are distributed proportionally to USDH minted).
  Arguments:
      - start_date: timestamp with time zone that specifies the inclusive start of the time interval to check for eligible loans
      - end_date: timestamp with time zone that specifies the exclusive end of the time interval to check for eligible loans
      - cluster_name: solana cluster name (devnet, mainnet-beta,...)
  Returns:
      - Table with rows with columns day (timestamp), user_metadata_pubkey (loan identifier) and median_usdh_debt.
  Example:
      - SELECT * FROM api.get_lido_usdh_debt('2022-06-20', '2022-07-01', 'mainnet-beta');
 */
CREATE FUNCTION api.get_lido_usdh_debt(start_date timestamp with time zone, end_date timestamp with time zone, cluster_name text)
    RETURNS TABLE
            (
                day timestamp with time zone,
                user_metadata_pubkey text,
                median_usdh_debt        numeric
            )
AS
$func$
BEGIN
    RETURN QUERY
        select date_trunc('day', l.created_on) as day,
               l.user_metadata_pubkey,
               percentile_cont(0.50) within group (order by l.usdh_debt)::numeric as median_usdh_debt
        from api.loan l
                 join api.collateral coll
                      on l.id = coll.loan_id
                 join api.token tok on coll.token_id = tok.id
                 join api.owner o on o.id = l.owner_id
                 join api.cluster clus on clus.id = o.cluster_id
        where clus.name = lower(cluster_name)
          and coll.deposited_quantity > 0
          and l.created_on >= start_date
          and l.created_on <= end_date
          and l.user_metadata_pubkey in (
            select res.user_metadata_pubkey from api.get_lido_eligible_loans(start_date, end_date, cluster_name) res)
        group by 1, 2;
END
$func$ LANGUAGE plpgsql;