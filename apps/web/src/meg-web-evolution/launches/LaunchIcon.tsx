import type {ReactNode, SVGProps} from 'react';
import {phosphorKpi} from './icon-packs/phosphor-kpi';
import {phosphorCategoryA} from './icon-packs/phosphor-category-a';
import {phosphorCategoryB} from './icon-packs/phosphor-category-b';
import {phosphorControls} from './icon-packs/phosphor-controls';
import {tablerKpi} from './icon-packs/tabler-kpi';
import {tablerCategoryA} from './icon-packs/tabler-category-a';
import {tablerCategoryB} from './icon-packs/tabler-category-b';
import {tablerControls} from './icon-packs/tabler-controls';

/**
 * Etapa 09: comparativo real com SVGs oficiais embutidos, sem CDN.
 * Fontes: https://github.com/phosphor-icons/core (MIT, Copyright (c) 2023 Phosphor Icons)
 *         https://github.com/tabler/tabler-icons (MIT, Copyright (c) 2020-2026 Paweł Kuna)
 *
 * LICENÇA MIT de ambos os projetos:
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * Apenas os nomes visuais usados em Lançamentos. O ID da categoria,
 * o estado dos filtros e as regras financeiras não passam pelo componente.
 * Phosphor Regular para controles/categorias, Duotone para KPIs;
 * Tabler Outline no modo comparativo.
 */

export type LaunchIconPack='phosphor'|'tabler';
export type LaunchIconName=
 'trendUp'|'trendDown'|'chart'|'wallet'|
 'grocery'|'health'|'transport'|'home'|'income'|'generic'|'food'|'fuel'|
 'education'|'leisure'|'services'|'gift'|'card'|'work'|'subscriptions'|
 'plus'|'search'|'calendar'|'chevronDown'|'chevronLeft'|'list';

const phosphorGlyphs={
 ...phosphorKpi,...phosphorCategoryA,...phosphorCategoryB,...phosphorControls
} as Record<LaunchIconName,ReactNode>;
const tablerGlyphs={
 ...tablerKpi,...tablerCategoryA,...tablerCategoryB,...tablerControls
} as Record<LaunchIconName,ReactNode>;

type Props=SVGProps<SVGSVGElement>&{name:LaunchIconName;pack?:LaunchIconPack};
export function LaunchIcon({name,pack='phosphor',...props}:Props){
 const isPhosphor=pack==='phosphor';
 return <svg
   viewBox={isPhosphor?'0 0 256 256':'0 0 24 24'}
   fill={isPhosphor?'currentColor':'none'}
   stroke={isPhosphor?'none':'currentColor'}
   strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
   width={24} height={24} focusable="false" aria-hidden="true"
   data-launch-icon={name} data-launch-pack={pack} {...props}
  >{isPhosphor?phosphorGlyphs[name]:tablerGlyphs[name]}</svg>;
}
