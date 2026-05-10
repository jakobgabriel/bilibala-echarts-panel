# Cookbook

Worked examples for the most common chart shapes. This is the canonical
home — the README links here rather than duplicating the snippets.

Each example is a complete `getOption` body: paste it into the editor as-is.

## Bar chart from a single time-series

```js
const valueField = data.series[0].fields.find((f) => f.type === 'number');
const timeField  = data.series[0].fields.find((f) => f.type === 'time');
return {
  xAxis: {
    type: 'category',
    data: timeField.values.map((t) => new Date(t).toLocaleTimeString()),
  },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: valueField.values }],
};
```

## Pie aggregated across series

```js
return {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie',
    radius: '70%',
    data: data.series.map((s) => ({
      name: s.name,
      value: s.fields.find((f) => f.type === 'number').values.reduce((a, b) => a + b, 0),
    })),
  }],
};
```

## Heatmap from a multi-series time query

```js
const points = [];
data.series.forEach((s, y) => {
  const valueField = s.fields.find((f) => f.type === 'number');
  valueField.values.forEach((v, x) => points.push([x, y, v]));
});
return {
  xAxis: { type: 'category', data: data.series[0].fields.find((f) => f.type === 'time').values },
  yAxis: { type: 'category', data: data.series.map((s) => s.name) },
  visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', bottom: 0 },
  series: [{ type: 'heatmap', data: points }],
};
```

## Where to go next

- Wire interactivity → [Editor contract → Side effects](editor.md#side-effects-between-renders).
- React to dashboard variables → [Dashboard variables](variables.md).
- Geo charts → [Maps](maps.md).

---

← [Home](index.md)
