# Current Task: Sprint 1, Iteration 1

## Do ONE thing: Generate the mock data

Create data/generate.py that generates 50,000 realistic PPP/EIDL loan records.

### Requirements
- Use Faker for realistic names, addresses, EINs
- Output to data/loans.json
- Exactly these fields per record:
  borrower_id, borrower_name, ssn_last4, business_name, ein, business_address,
  business_city, business_state, business_zip, employee_count, business_age_months,
  loan_program (PPP or EIDL), loan_amount, loan_date (2020-04-01 to 2021-03-31),
  lender_name, bank_routing, bank_account, naics_code, industry,
  fraud_label (bool), fraud_type (str or null)

### Seed these fraud archetypes (~5% fraud rate total):
1. address_farm: 400 records — 8 addresses × 50 businesses each
2. ein_recycler: 300 records — 100 EINs × 3 businesses each
3. straw_company: 500 records — employee_count=0, age<6mo, amount>$100K
4. network_cluster: 350 records — 35 routing numbers × 10 businesses each
5. threshold_gamer: 450 records — loan_amount $145,000-$149,999
6. ~48,000 clean records with realistic noise

### Done when:
- data/generate.py exists and runs without errors
- python3 data/generate.py outputs 50000 records to data/loans.json
- Print a summary: total records, fraud count, fraud rate, archetype breakdown
- Run bash verify.sh and it passes

## When complete, write to progress.md:
Line 1: ITERATION_DONE
Line 2: what was built
Line 3: what the next iteration should do
