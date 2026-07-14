/**
 * 全局：任意元素滚动时短暂加上 .is-scrolling，
 * 配合 index.css 里「默认隐藏、滚动时显示」的滚动条样式。
 */
const HIDE_DELAY_MS = 800;
const hideTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

function resolveScrollTarget(event: Event): Element | null {
  const raw = event.target;
  if (raw instanceof Document) {
    return document.scrollingElement ?? document.documentElement;
  }
  if (raw instanceof Element) return raw;
  return null;
}

function onScrollCapture(event: Event) {
  const target = resolveScrollTarget(event);
  if (!target) return;
  // 显式永久隐藏的区域不参与「滚动时显示」。
  if (target.closest(".no-scrollbar")) return;

  target.classList.add("is-scrolling");
  const prev = hideTimers.get(target);
  if (prev) clearTimeout(prev);
  hideTimers.set(
    target,
    setTimeout(() => {
      target.classList.remove("is-scrolling");
      hideTimers.delete(target);
    }, HIDE_DELAY_MS),
  );
}

let installed = false;

/** 在应用入口调用一次即可。 */
export function installScrollVisibility() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("scroll", onScrollCapture, {
    capture: true,
    passive: true,
  });
}
