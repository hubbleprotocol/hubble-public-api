/*
  Summary:
      Get LIDO rewards eligible Hubble loans for the specified time interval.
      For a Hubble loan to be eligible for LIDO rewards it must have at least 40% LTV throughout the specified time and
      at least 40% of the total collateral value must be in STSOL or wstETH tokens.
  Arguments:
      - start_date: timestamp with time zone that specifies the inclusive start of the time interval to check for eligible loans
      - end_date: timestamp with time zone that specifies the exclusive end of the time interval to check for eligible loans
  Returns:
      - Table with rows that include user_metadata_pubkey (loan identifier), number of eligible days, from_date and to_date.
  Example:
      - SELECT * FROM get_lido_eligible_loans('2022-06-20', '2022-07-01');
 */
CREATE OR REPLACE FUNCTION get_lido_eligible_loans(start_date timestamp with time zone, end_date timestamp with time zone)
    RETURNS TABLE
            (
                user_metadata_pubkey text,
                days_eligible        integer,
                from_date            timestamp with time zone,
                to_date              timestamp with time zone
            )
AS
$func$
BEGIN
    RETURN QUERY
        select res.user_metadata_pubkey, (res.to_date::date - res.from_date::date) as days_eligible, res.from_date, res.to_date
        from (select res.user_metadata_pubkey, res.token_id, avg(coll_percentage) as avg_coll_percent, min(day) as from_date, max(day) as to_date
              from (select date_trunc('day', l.created_on)                                                    as day,
                           l.user_metadata_pubkey,
                           coll.token_id,
                           ((avg(coll.deposited_quantity) * avg(coll.price)) / avg(l.total_collateral_value)) as coll_percentage
                    from api.loan l
                             join api.collateral coll on l.id = coll.loan_id
                             join api.token tok on coll.token_id = tok.id
                    where (lower(tok.name) = 'stsol' or lower(tok.name) = 'wsteth')
                      and coll.deposited_quantity > 0
                      and l.created_on >= start_date
                      and l.created_on <= end_date
                    group by 1, 2, 3) res
              group by 1, 2) res
        group by 1, 2, 3, 4
        having sum(avg_coll_percent) > 0.4
           and (res.to_date::date - res.from_date::date) >= (end_date::date - start_date::date) - 1
        order by days_eligible desc;
END
$func$ LANGUAGE plpgsql;