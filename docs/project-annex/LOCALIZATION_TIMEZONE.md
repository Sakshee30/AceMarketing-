# Localization and timezone project annex

AceMarketing currently ships English product copy, while all reusable date/number/currency formatting should use the owned localization package rather than ad-hoc browser calls.

## Current contract

- Stored event/scheduling instants use UTC ISO timestamps when crossing API boundaries.
- Display formatting uses the browser locale unless a product/profile locale is supplied.
- Display timezone uses the browser-resolved IANA timezone unless a product/profile timezone is supplied.
- Currency formatting requires an explicit ISO currency code; business pricing contracts remain backend authoritative.
- Invalid dates render an em dash instead of throwing during presentation.

## Translation status

Full translated product copy and right-to-left production support are **not yet claimed**. Before enabling another UI language:
1. move customer-visible copy to owned translation keys;
2. test long translations;
3. test RTL ordering, scrolling and drag interaction;
4. verify keyboard and assistive-technology journeys;
5. record locale-specific number, date, currency and plural behavior.

Machine status identifiers and backend workflow codes must remain stable and language-neutral even when presentation labels are translated.

## Scheduling

Customer/demo booking continues to submit an authoritative UTC instant. A future business-local scheduling profile must declare the scheduling timezone explicitly and add daylight-saving transition tests before it can replace browser-local scheduling assumptions.
