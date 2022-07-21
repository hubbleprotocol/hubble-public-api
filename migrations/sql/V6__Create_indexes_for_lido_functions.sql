create index idx__loan__created_on__user_metadata_pubkey on api.loan using btree (created_on, user_metadata_pubkey);
create index idx__collateral__deposited_quantity on api.collateral using btree (deposited_quantity);
create index idx__token__name on api.token using btree (name);
create index idx__cluster__name on api.cluster using btree (name);