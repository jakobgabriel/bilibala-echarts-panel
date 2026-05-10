# Dashboard variables

The `grafana` parameter exposes the four most common variable
interactions without having to import anything from the Grafana runtime
yourself.

## Reading the current values

```js
// grafana.variables is a flat { name: currentValue } map. Multi-select
// variables come through as arrays; single-value as strings.
return {
  title: { text: `Region: ${grafana.variables.region ?? '(unset)'}` },
  series: [/* ... */],
};
```

## Interpolating templates

```js
// grafana.replace runs Grafana's standard $var / ${var:csv} / [[var]]
// substitution. Use it for any string the chart will render.
return {
  title: { text: grafana.replace('Latency for $region — last $__interval') },
  series: [/* ... */],
};
```

## Driving variables from chart interactions

```js
// Click a slice → set a dashboard variable → every other panel re-queries.
echartsInstance.off('click');
echartsInstance.on('click', (params) => {
  grafana.setVariable('region', params.name);
});
return { /* ... */ };
```

For multi-select variables, pass an array:
`grafana.setVariable('servers', ['a', 'b'])`.

## Manually triggering a refresh

```js
// Equivalent to clicking the dashboard refresh button. Rare — variable
// changes already trigger a refresh — but useful for "refresh now" buttons
// drawn with echarts.graphic.
grafana.refresh();
```

> Use `current.value` (what queries see), not the visible label. For
> "All" selections Grafana exposes `'$__all'` — pass it through
> unchanged; queries already understand it.

---

← [Home](index.md)
