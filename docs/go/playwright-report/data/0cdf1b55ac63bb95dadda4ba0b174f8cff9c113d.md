# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: security-probes.spec.ts >> Security Probes (SECURITY-PATCH.md §5) >> Probe 3: GET properties/prop_rocks_lusaka returns 200 without private contactEmail or suspendedBy
- Location: tests\security\probe.spec.ts:44:3

# Error details

```
Error: expect(received).toBeUndefined()

Received: {"stringValue": "joe.zaza@rocksapartments.zm"}
```