/*
  Summary:
      Get LIDO rewards eligible Hubble loans for the specified time interval.
      For a Hubble loan to be eligible for LIDO rewards it must have at least 40% LTV throughout the specified time and
      at least 40% of the total collateral value must be in STSOL or wstETH tokens.
  Arguments:
      - start_date: timestamp with time zone that specifies the inclusive start of the time interval to check for eligible loans
      - end_date: timestamp with time zone that specifies the exclusive end of the time interval to check for eligible loans
      - cluster_name: solana cluster name (devnet, mainnet-beta,...)
  Returns:
      - Table with rows of user_metadata_pubkey (loan identifier)
  Example:
      - SELECT * FROM get_lido_eligible_loans('2022-06-20', '2022-07-01', 'mainnet-beta');
 */
CREATE FUNCTION api.get_lido_eligible_loans(start_date timestamp with time zone, end_date timestamp with time zone, cluster_name text)
    RETURNS TABLE
            (
                user_metadata_pubkey text
            )
AS
$func$
BEGIN
    RETURN QUERY
        select res.user_metadata_pubkey
        from (select res.user_metadata_pubkey, res.token_id, avg(coll_percentage) as avg_coll_percent, min(day) as from_date, max(day) as to_date
              from (select date_trunc('day', l.created_on) as day,
                           l.user_metadata_pubkey,
                           coll.token_id,
                           ((avg(coll.deposited_quantity) * avg(coll.price)) / avg(l.total_collateral_value)) as coll_percentage
                    from api.loan l
                             join api.collateral coll on l.id = coll.loan_id
                             join api.token tok on coll.token_id = tok.id
                             join api.owner o on o.id = l.owner_id
                             join api.cluster clus on clus.id = o.cluster_id
                    where (lower(tok.name) = 'stsol' or lower(tok.name) = 'wsteth')
                      and lower(clus.name) = lower(cluster_name)
                      and coll.deposited_quantity > 0
                      and l.created_on >= start_date
                      and l.created_on <= end_date
                    group by 1, 2, 3
                    having avg(l.loan_to_value) >= 40) res --loan_to_value is in percentage format, not in decimal format, 40% = 0.4
              group by 1, 2) res
        group by 1, res.to_date, res.from_date
        having sum(avg_coll_percent) >= 0.4
           and (res.to_date::date - res.from_date::date) >= (end_date::date - start_date::date) - 1;
END
$func$ LANGUAGE plpgsql;