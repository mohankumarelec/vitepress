import type MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import type { RenderRule } from 'markdown-it/lib/renderer.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import { nanoid } from 'nanoid'
import type { MarkdownEnv } from '../../shared'

import {
  extractTitle,
  getAdaptiveThemeMarker,
  type Options
} from './preWrapper'

export const containerPlugin = (
  md: MarkdownIt,
  options: Options,
  containerOptions?: ContainerOptions
) => {
  md.use(...createContainer('tip', containerOptions?.tipLabel || 'TIP', md))
    .use(...createContainer('info', containerOptions?.infoLabel || 'INFO', md))
    .use(
      ...createContainer(
        'warning',
        containerOptions?.warningLabel || 'WARNING',
        md
      )
    )
    .use(
      ...createContainer(
        'danger',
        containerOptions?.dangerLabel || 'DANGER',
        md
      )
    )
    .use(
      ...createContainer(
        'details',
        containerOptions?.detailsLabel || 'Details',
        md
      )
    )
    // explicitly escape Vue syntax
    .use(container, 'v-pre', {
      render: (tokens: Token[], idx: number) =>
        tokens[idx].nesting === 1 ? `<div v-pre>\n` : `</div>\n`
    })
    .use(container, 'raw', {
      render: (tokens: Token[], idx: number) =>
        tokens[idx].nesting === 1 ? `<div class="vp-raw">\n` : `</div>\n`
    })
    .use(...createCodeGroup(options, md))
}

type ContainerArgs = [typeof container, string, { render: RenderRule }]

function createContainer(
  klass: string,
  defaultTitle: string,
  md: MarkdownIt
): ContainerArgs {
  return [
    container,
    klass,
    {
      render(tokens, idx, _options, env: MarkdownEnv & { references?: any }) {
        const token = tokens[idx]
        const info = token.info.trim().slice(klass.length).trim()
        const attrs = md.renderer.renderAttrs(token)
        if (token.nesting === 1) {
          const title = md.renderInline(info || defaultTitle, {
            references: env.references
          })
          if (klass === 'details')
            return `<details class="${klass} custom-block"${attrs}><summary>${title}</summary>\n`
          return `<div class="${klass} custom-block"${attrs}><p class="custom-block-title">${title}</p>\n`
        } else return klass === 'details' ? `</details>\n` : `</div>\n`
      }
    }
  ]
}

function createCodeGroup(options: Options, md: MarkdownIt): ContainerArgs {
  return [
    container,
    'code-group',
    {
      render(tokens, idx) {
        if (tokens[idx].nesting === 1) {
          const name = nanoid(5)
          let tabs = ''
          let checked = 'checked'
          const playButtonId = `play-button-${nanoid(7)}`
          let defaultPlayButtonLink = null

          for (
            let i = idx + 1;
            !(
              tokens[i].nesting === -1 &&
              tokens[i].type === 'container_code-group_close'
            );
            ++i
          ) {
            const isHtml = tokens[i].type === 'html_block'

            if (
              (tokens[i].type === 'fence' && tokens[i].tag === 'code') ||
              isHtml
            ) {
              const title = extractTitle(
                isHtml ? tokens[i].content : tokens[i].info,
                isHtml
              )
              const link = tokens[i].info.match(/\((.*?)\)/)?.[1]
              if (!defaultPlayButtonLink && link) {
                defaultPlayButtonLink = atob(link)
              }

              if (title) {
                const id = nanoid(7)
                tabs += `
<input type="radio" x-play-button-link="${link}" x-play-button-id="${playButtonId}" name="group-${name}" id="tab-${id}" ${checked}>
<label data-title="${md.utils.escapeHtml(title)}" for="tab-${id}" style="display: inline-flex; align-items: center; gap: 8px;">
  <img src="https://api.iconify.design/vscode-icons/file-type-python.svg" alt="Code group icon" width="16" height="16">
  <span>${title}</span>
</label>
                `.trim() + '\n'
                if (checked && !isHtml) tokens[i].info += ' active'
                checked = ''
              }
            }
          }

          return (
            `
<div class="vp-code-group${getAdaptiveThemeMarker(options)}">
  <div class="tabs">
    <div>${tabs}</div>
    ${
      defaultPlayButtonLink
        ? `
    <a id="${playButtonId}" href="${defaultPlayButtonLink}" target="_blank">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="168"
        height="20"
        role="img"
        aria-label="Run instantly in playground"
      >
        <title>Run instantly in playground</title>
        <linearGradient id="s" x2="0" y2="100%">
          <stop offset="0" stop-color="#bbb" stop-opacity=".1" />
          <stop offset="1" stop-opacity=".1" />
        </linearGradient>
        <clipPath id="r">
          <rect width="168" height="20" rx="3" fill="#fff" />
        </clipPath>
        <g clip-path="url(#r)">
          <rect width="97" height="20" fill="#555" />
          <rect x="97" width="71" height="20" fill="#f3bc4d" />
          <rect width="168" height="20" fill="url(#s)" />
        </g>
        <g
          fill="#fff"
          text-anchor="middle"
          font-family="Verdana,Geneva,DejaVu Sans,sans-serif"
          text-rendering="geometricPrecision"
          font-size="110"
        >
          <text
            aria-hidden="true"
            x="495"
            y="150"
            fill="#010101"
            fill-opacity=".3"
            transform="scale(.1)"
            textLength="870"
          >
            Run instantly in
          </text>
          <text x="495" y="140" transform="scale(.1)" fill="#fff" textLength="870">
            Run instantly in
          </text>
          <text
            aria-hidden="true"
            x="1315"
            y="150"
            fill="#010101"
            fill-opacity=".3"
            textLength="610"
          >
            playground
          </text>
          <text x="1315" y="140" transform="scale(.1)" fill="#513400" textLength="610">
            playground
          </text>
        </g>
      </svg>
    </a>`
        : '<div></div>'
    }
  </div>
  <div class="blocks">
              `.trim() + '\n'
          )
        }
        return `</div></div>\n`
      }
    }
  ]
}

export interface ContainerOptions {
  infoLabel?: string
  noteLabel?: string
  tipLabel?: string
  warningLabel?: string
  dangerLabel?: string
  detailsLabel?: string
  importantLabel?: string
  cautionLabel?: string
}
