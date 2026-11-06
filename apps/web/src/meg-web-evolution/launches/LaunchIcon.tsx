import type {ReactNode, SVGProps} from 'react';
import {phosphorKpi} from './icon-packs/phosphor-kpi';
import {phosphorCategoryA} from './icon-packs/phosphor-category-a';
import {phosphorCategoryB} from './icon-packs/phosphor-category-b';
import {phosphorControls} from './icon-packs/phosphor-controls';
import {categorySemanticExtended} from './icon-packs/category-semantic-extended';

/**
 * Pacote Phosphor Core (MIT), licença e aviso de copyright preservados.
 * Fonte: https://github.com/phosphor-icons/core
 * Copyright (c) 2023 Phosphor Icons.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * Lançamentos Etapa 09: Regular em categorias/controles, Duotone nos KPIs.
 * Sem CDN, sem reclassificar categorias, sem modificar cálculos financeiros.
 */

export type LaunchIconName=
 'trendUp'|'trendDown'|'chart'|'wallet'|
 'grocery'|'marketCart'|'motorcycle'|'petPaw'|'clothing'|'electronics'|'hygiene'|'schoolSupplies'|'debt'|'savings'|'beverages'|'fastFood'|'reimbursement'|'health'|'transport'|'home'|'income'|'generic'|'food'|'fuel'|
 'education'|'leisure'|'services'|'gift'|'card'|'work'|'subscriptions'|
 'plus'|'search'|'calendar'|'chevronDown'|'chevronLeft'|'list';

const phosphorGlyphs={
 ...phosphorKpi,...phosphorCategoryA,...phosphorCategoryB,...phosphorControls,...categorySemanticExtended
} as Record<LaunchIconName,ReactNode>;

const megSemanticIcons:ReadonlySet<LaunchIconName>=new Set(['marketCart','motorcycle','petPaw','clothing','electronics','hygiene','schoolSupplies','debt','savings','beverages','fastFood','reimbursement']);
type Props=SVGProps<SVGSVGElement>&{name:LaunchIconName};
export function LaunchIcon({name,...props}:Props){
 return <svg
   viewBox="0 0 256 256"
   fill="currentColor"
   width={24} height={24} focusable="false" aria-hidden="true"
   data-launch-icon={name} data-launch-pack={megSemanticIcons.has(name)?'meg-semantic':'phosphor'} {...props}
  >{phosphorGlyphs[name]}</svg>;
}
