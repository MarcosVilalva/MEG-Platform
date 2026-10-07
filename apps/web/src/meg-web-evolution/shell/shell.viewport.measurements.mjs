export const responsiveViewports = [
  { width: 1023, height: 768 },
  { width: 900, height: 700 },
  { width: 768, height: 600 },
  { width: 700, height: 600 },
  { width: 640, height: 600 },
  { width: 639, height: 600 },
  { width: 390, height: 844 },
];

export const sidebarResponsiveViewports = [
  { width: 1366, height: 600 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 1000, height: 890 },
  { width: 1024, height: 600 },
  { width: 900, height: 560 },
  { width: 690, height: 600 },
  { width: 768, height: 520 },
  { width: 480, height: 520 },
  { width: 480, height: 480 },
];

export function createMeasureResponsiveTopbar(evaluate) {
  return async function measureResponsiveTopbar() {
    return evaluate(`(() => {
      const selectors = {
        menu: '.meg-menu-button',
        search: '.meg-search',
        period: '.meg-period',
        notification: '.meg-notification',
        profile: '.meg-profile',
      };

      const elements = Object.fromEntries(
        Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)])
      );

      const rects = Object.fromEntries(
        Object.entries(elements).map(([key, element]) => {
          if (!element) return [key, null];
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return [key, null];
          const rect = element.getBoundingClientRect();
          return [key, {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          }];
        })
      );

      const visibleRects = Object.entries(rects).filter(([, rect]) => rect && rect.width > 0 && rect.height > 0);
      const overlaps = [];
      for (let i = 0; i < visibleRects.length; i += 1) {
        for (let j = i + 1; j < visibleRects.length; j += 1) {
          const [aName, a] = visibleRects[i];
          const [bName, b] = visibleRects[j];
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 1 && overlapY > 1) overlaps.push(aName + 'x' + bName);
        }
      }

      const period = elements.period;
      const periodLabel = period?.querySelector('span');
      const root = document.documentElement;
      const topbar = document.querySelector('.meg-topbar');
      const topbarRect = topbar?.getBoundingClientRect();

      const outsideViewport = visibleRects
        .filter(([, rect]) =>
          rect.left < 0 ||
          rect.top < 0 ||
          rect.right > window.innerWidth ||
          rect.bottom > window.innerHeight
        )
        .map(([name, rect]) => ({
          name,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        }));

      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        overlaps,
        outsideViewport,
        allInsideViewport: outsideViewport.length === 0,
        allInsideTopbar: topbarRect
          ? visibleRects.every(([, rect]) =>
              rect.left >= topbarRect.left - 1 &&
              rect.top >= topbarRect.top - 1 &&
              rect.right <= topbarRect.right + 1 &&
              rect.bottom <= topbarRect.bottom + 1
            )
          : false,
        periodOneLine: periodLabel
          ? periodLabel.getClientRects().length === 1 &&
            periodLabel.scrollWidth <= periodLabel.clientWidth
          : false,
        searchWidth: rects.search?.width || 0,
        searchInputWidth: elements.search?.querySelector('input')?.getBoundingClientRect().width || 0,
        searchInputOpacity: elements.search?.querySelector('input') ? getComputedStyle(elements.search.querySelector('input')).opacity : '0',
        periodWidth: rects.period?.width || 0,
        topbarHeight: topbarRect?.height || 0,
      };
    })()`);
  };
}

export function createMeasureSidebarResponsive(evaluate) {
  return async function measureSidebarResponsive() {
    return evaluate(`(() => {
      const root = document.documentElement;
      const sidebar = document.querySelector('.meg-sidebar');
      const nav = document.querySelector('.meg-nav');
      const footer = document.querySelector('.meg-sidebar-footer');
      const logout = footer?.querySelector('.meg-logout-button');
      const art = document.querySelector('.sidebar__art');
      const items = [...document.querySelectorAll('.meg-nav .meg-nav-item')];
      const dividerStyle = footer ? getComputedStyle(footer, '::before') : null;

      if (!sidebar || !nav || !footer || !logout || items.length !== 7) {
        return { missing: true, itemCount: items.length };
      }

      const brand = document.querySelector('.meg-brand');
      const artRectElement = document.querySelector('.sidebar__art');
      const brandRect = brand?.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const logoutRect = logout.getBoundingClientRect();
      const artRect = artRectElement?.getBoundingClientRect();
      const dividerTop = footerRect.top + (parseFloat(dividerStyle?.top || '0') || 0);
      const dividerHeight = parseFloat(dividerStyle?.height || '0') || 0;
      const dividerRect = {
        top: dividerTop,
        bottom: dividerTop + dividerHeight,
        height: dividerHeight,
        left: footerRect.left,
        right: footerRect.right,
      };

      const itemRects = items.map((item, index) => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const hit = document.elementFromPoint(centerX, centerY);
        return {
          index: index + 1,
          label: item.getAttribute('aria-label') || item.textContent?.trim() || ('item-' + (index + 1)),
          width: rect.width,
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom,
          fullyInsideNav:
            rect.left >= navRect.left - 1 &&
            rect.right <= navRect.right + 1 &&
            rect.top >= navRect.top - 1 &&
            rect.bottom <= navRect.bottom + 1,
          overlapsFooter:
            Math.min(rect.bottom, footerRect.bottom) - Math.max(rect.top, footerRect.top) > 1,
          visibleAtCenter: Boolean(hit && (hit === item || item.contains(hit))),
        };
      });

      const parseRgb = (value) => {
        const match = value?.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        return match ? match.slice(1, 4).map(Number) : null;
      };
      const dividerRgb = parseRgb(dividerStyle?.backgroundColor);
      const dividerNeutral = dividerRgb
        ? Math.max(...dividerRgb) - Math.min(...dividerRgb) <= 8
        : false;

      const maxItemHeight = Math.max(...itemRects.map((item) => item.height), 0);
      const lastItem = itemRects[itemRects.length - 1];
      const needsScroll = nav.scrollHeight > nav.clientHeight + 1;
      const gapToFooter = Math.max(0, footerRect.top - lastItem.bottom);
      const item5 = itemRects[4] || null;
      const overlaps = [];
      if (item5) {
        const overlapY = (name, rect) => {
          if (!rect) return;
          const overlap = Math.min(item5.bottom, rect.bottom) - Math.max(item5.top, rect.top);
          if (overlap > 1) overlaps.push({ name, overlap });
        };
        overlapY('logo', brandRect);
        overlapY('divisor', dividerRect);
        overlapY('rodape', footerRect);
        overlapY('grafismo', artRect);
        if (item5.top < navRect.top - 1) overlaps.push({ name: 'nav-top-clipping', overlap: navRect.top - item5.top });
        if (item5.bottom > navRect.bottom + 1) overlaps.push({ name: 'nav-bottom-clipping', overlap: item5.bottom - navRect.bottom });
      }

      const rectSummary = (rect) => rect ? ({
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
      }) : null;

      return {
        missing: false,
        innerHeight: window.innerHeight,
        documentScrollHeight: root.scrollHeight,
        sidebarTop: sidebarRect.top,
        sidebarBottom: sidebarRect.bottom,
        sidebarRect: rectSummary(sidebarRect),
        brandRect: rectSummary(brandRect),
        navTop: navRect.top,
        navBottom: navRect.bottom,
        navRect: rectSummary(navRect),
        navClientHeight: nav.clientHeight,
        navScrollHeight: nav.scrollHeight,
        navOverflowY: getComputedStyle(nav).overflowY,
        needsScroll,
        itemCount: items.length,
        itemRects,
        maxItemHeight,
        lastItemBottom: lastItem.bottom,
        gapToFooter,
        footerTop: footerRect.top,
        footerRect: rectSummary(footerRect),
        logoutRect: rectSummary(logoutRect),
        dividerRect: rectSummary(dividerRect),
        artRect: rectSummary(artRect),
        item5Overlaps: overlaps,
        dividerNeutral,
        dividerColor: dividerStyle?.backgroundColor || '',
        artDisplay: art ? getComputedStyle(art).display : 'missing',
      };
    })()`);
  };
}
