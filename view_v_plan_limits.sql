create or replace view v_plan_limits as
select
  s.owner_user_id,
  s.plan,
  case s.plan
    when 'autonomo' then 1
    when 'ate_3'    then 3
    when 'ate_5'    then 5
  end as max_professionals
from subscriptions s;
