import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/css';
import { funcParams } from '../types';
import CodeMirror from 'codemirror';
import { ECHARTS_HINTS, lookupHints } from './echartsHints';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/seti.css';

import 'codemirror/mode/javascript/javascript';

import 'codemirror/addon/display/autorefresh';

import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/fold/comment-fold.js';

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';

import 'codemirror/addon/selection/active-line.js';
import 'codemirror/keymap/sublime.js';

import 'codemirror/addon/comment/comment.js';

import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/lint/lint.js';
import 'codemirror/addon/lint/javascript-lint.js';

import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/hint/javascript-hint.js';

// The lint addon expects window.JSHINT to exist. JSHint is plain JS with
// no ES module entry, so attach it explicitly here so the addon picks it up.
import JSHINT from 'jshint';
(window as unknown as { JSHINT: unknown }).JSHINT =
  (JSHINT as { JSHINT?: unknown }).JSHINT ?? JSHINT;

const getStyles = () => ({
  span: css`
    padding: 2px;
    opacity: 0.6;
    font-size: 12px;
  `,
  // Default height fits ~50 lines (CodeMirror's stock 300px default
  // showed ~15 lines, so 50 lines ≈ 1000px); min-height is the same
  // value so the resize handle can only drag taller, never below 50
  // lines. The Grafana panel-options pane is vertically scrollable, so
  // a tall editor just pushes the next field down — nothing overlaps.
  wrap: css`
    height: 1024px;
    min-height: 1024px;
    resize: vertical;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .CodeMirror {
      flex: 1 1 auto;
      height: auto;
      min-height: 0;
    }
  `,
});

interface Props {
  value: string;
  onChange: (value?: string) => void;
}

function customEchartsHint(cm: CodeMirror.Editor) {
  const cur = cm.getCursor();
  const token = cm.getTokenAt(cur);
  // Walk back through `.`-separated identifiers preceding the cursor so we
  // can resolve `data.series.` → children of `data.series`.
  const lineUpToCursor = cm.getLine(cur.line).slice(0, cur.ch);
  const trailing = lineUpToCursor.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.?$/);
  let prefix: string[] = [];
  let typed = '';
  if (trailing) {
    const parts = trailing[1].split('.');
    if (lineUpToCursor.endsWith('.')) {
      prefix = parts;
      typed = '';
    } else {
      prefix = parts.slice(0, -1);
      typed = parts[parts.length - 1] ?? '';
    }
  }
  const candidates = prefix.length === 0 ? ECHARTS_HINTS : lookupHints(prefix);
  if (!candidates) {
    // Fall back to the upstream JS keyword/identifier hinter so users
    // still get something useful in unrelated positions.
    const cmAny = CodeMirror as unknown as {
      hint?: { javascript?: (cm: CodeMirror.Editor) => unknown };
    };
    return cmAny.hint && cmAny.hint.javascript ? cmAny.hint.javascript(cm) : undefined;
  }
  const list = Object.entries(candidates)
    .filter(([name]) => !typed || name.startsWith(typed))
    .map(([name, node]) => ({
      text: name,
      displayText: node.doc ? `${name} — ${node.doc}` : name,
    }));
  return {
    list,
    from: CodeMirror.Pos(cur.line, cur.ch - typed.length),
    to: CodeMirror.Pos(cur.line, cur.ch + (token.string === '.' ? 0 : 0)),
  };
}

export const FieldCMEditor: React.FC<Props> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const styles = getStyles();

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const cm = CodeMirror.fromTextArea(editorRef.current, {
      autoRefresh: true,

      theme: 'seti',
      mode: 'javascript',
      keyMap: 'sublime',

      tabSize: 2,
      smartIndent: true,
      indentUnit: 2,

      lineNumbers: true,
      inputStyle: 'contenteditable',
      foldGutter: true,
      gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter'],

      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,

      // The lint addon's options are passed straight through to JSHint.
      // CodeMirror's TS types only describe the addon-side flags, so cast
      // to silence the structural mismatch.
      lint: {
        esversion: 11,
        asi: true,
        '-W040': true,
        globals: {
          data: false,
          theme: false,
          echartsInstance: false,
          echarts: false,
          loadMap: false,
          grafana: false,
          window: false,
          console: false,
          fetch: false,
          Promise: false,
          Object: false,
          Array: false,
          Math: false,
          Date: false,
          JSON: false,
          Number: false,
          String: false,
        },
      } as unknown as CodeMirror.EditorConfiguration['lint'],

      extraKeys: {
        'Cmd-/': 'toggleComment',
        'Ctrl-/': 'toggleComment',
        'Ctrl-Space': () => cm.showHint({ hint: customEchartsHint, completeSingle: false }),
      },
    });

    cm.on('blur', (cm: CodeMirror.Editor) => {
      onChange(cm.getDoc().getValue());
    });

    // Fill the wrap div so `resize: vertical` on the wrap is what
    // controls the editor's height. Without this, .CodeMirror keeps its
    // default 300px and the wrap's resize handle does nothing visible.
    cm.setSize(null, '100%');

    // Re-measure when the wrap is dragged taller. autoRefresh handles
    // the initial layout pass; ResizeObserver covers user-driven resizes.
    const wrap = editorRef.current?.parentElement;
    let resizeObserver: ResizeObserver | undefined;
    if (wrap && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => cm.refresh());
      resizeObserver.observe(wrap);
    }

    // bad hack: try to fix display problems when CodeMirror is initialized
    setTimeout(() => cm.refresh(), 300);

    return () => {
      resizeObserver?.disconnect();
      if (cm) {
        cm.toTextArea();
      }
    };
  }, [onChange]);

  return (
    <>
      <span className={styles.span}>{`function (${funcParams}) {`}</span>
      <div className={styles.wrap}>
        <textarea ref={editorRef} value={value} />
      </div>
      <span className={styles.span}>{`}`}</span>
    </>
  );
};
