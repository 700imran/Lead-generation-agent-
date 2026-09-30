import json, pathlib, re
root=pathlib.Path(__file__).parents[1]
a=json.loads((root/'agency/agency.json').read_text())
actions=json.loads((root/'agency/actions.json').read_text())
ids={x['id'] for x in a['subagents']}
assert a['main_agent']=='agency-main'
required={'psychology-research','behavior-strategy','uiux','growth-optimization','developer'}
assert required <= ids
for name,flow in actions.items():
    assert flow['steps'], name
    for s in flow['steps']:
        assert s['agent'] in ids or s['agent']=='agency-main', (name,s)
        assert 1 <= s['max_tasks'] <= 5
for p in ids:
    assert (root/'hermes-overlay/profiles'/p/'SOUL.md').exists(), p
assert a['website_revenue_engine_connector']['enabled_by_design']
assert a['product_model']['client_instance_model']
assert {'website_service','revenue_engine_service'} <= set(a['product_model'])
worker=(root/'cloudflare-worker/src/index.js').read_text()
assert 'async scheduled' in worker
assert '/api/tick' in worker
assert 'ADMIN_TOKEN' in worker
schema=(root/'cloudflare-worker/schema.sql').read_text()
for t in ['client_instances','website_connectors','growth_audits','subscriptions']:
    assert f'CREATE TABLE IF NOT EXISTS {t}' in schema
print('PASS: v0.6 agency manifest, psychology/UIUX/growth/developer workers, revenue-engine instance model, bounded loops, schema and Worker controls')
