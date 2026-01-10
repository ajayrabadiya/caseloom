"use strict";

class KTSplitter {
    constructor(element, options = {}) {
        this.element = typeof element === "string" ? document.querySelector(element) : element;
        if (!this.element) return;

        this.options = Object.assign({
            min: 150,
            max: 600,
            orientation: "horizontal"
        }, options);

        this.dragging = false;
        this.init();
    }

    init() {
        // Only DIRECT child splitter bars
        this.bars = [...this.element.children].filter(el => el.hasAttribute("data-splitter-bar"));
        this.bar = this.bars[0];
        if (!this.bar) return;

        if (this.options.orientation === "vertical") {
            this.initVertical();
        } else {
            this.initHorizontal();
        }
    }

    /* =========================
       VERTICAL (TOP / BOTTOM)
    ========================== */
    initVertical() {
        this.top = this.element.querySelector('[data-splitter-pane="top"]');
        this.bottom = this.element.querySelector('[data-splitter-pane="bottom"]');
        if (!this.top || !this.bottom) return;

        /* 🔑 FIX:
           - Top CAN shrink
           - Bottom is fixed + scrollable
        */
        this.top.style.flexShrink = "1";
        this.bottom.style.flexShrink = "0";
        this.bottom.style.overflow = "auto";

        // Store original transitions
        this.topTransition = this.top.style.transition;
        this.bottomTransition = this.bottom.style.transition;

        this.bar.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.dragging = true;

            this.startY = e.clientY;
            this.startHeight = this.top.offsetHeight;

            // Disable transitions during dragging for smooth movement
            this.top.style.transition = "none";
            this.bottom.style.transition = "none";

            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
        });

        const handleMove = (e) => {
            if (!this.dragging) return;

            const deltaY = e.clientY - this.startY;
            const newTopHeight = this.startHeight + deltaY;

            const containerHeight = this.element.offsetHeight;
            const barHeight = this.bar.offsetHeight || 0;

            const minTop = this.options.min;
            const minBottom =
                parseInt(getComputedStyle(this.bottom).minHeight) || this.options.min;

            if (
                newTopHeight >= minTop &&
                newTopHeight <= containerHeight - minBottom - barHeight
            ) {
                // Use requestAnimationFrame for smoother updates
                requestAnimationFrame(() => {
                    // Top pane
                    this.top.style.height = newTopHeight + "px";

                    // Bottom pane
                    this.bottom.style.height =
                        (containerHeight - newTopHeight - barHeight) + "px";
                });
            }
        };

        document.addEventListener("mousemove", handleMove);

        document.addEventListener("mouseup", () => {
            if (this.dragging) {
                // Re-enable transitions after dragging
                this.top.style.transition = this.topTransition || "";
                this.bottom.style.transition = this.bottomTransition || "";
            }
            this.dragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        });
    }

    /* =========================
       HORIZONTAL (LEFT / RIGHT / MIDDLE)
    ========================== */
    initHorizontal() {
        this.left = this.element.querySelector('[data-splitter-pane="left"]');
        this.right = this.element.querySelector('[data-splitter-pane="right"]');
        this.middle =
            this.element.querySelector('.splitter-pane:not([data-splitter-pane])') ||
            Array.from(this.element.querySelectorAll('.splitter-pane')).find(p =>
                !p.hasAttribute('data-splitter-pane') ||
                (p.getAttribute('data-splitter-pane') !== 'left' &&
                 p.getAttribute('data-splitter-pane') !== 'right')
            );

        const bars = Array.from(this.element.children).filter(el =>
            el.hasAttribute("data-splitter-bar")
        );

        if (!this.left) return;

        this.left.style.flexShrink = "0";
        if (this.right) this.right.style.flexShrink = "0";
        if (this.middle) this.middle.style.flex = "1 1 auto";

        if (this.left && this.middle && this.right && bars.length === 2) {
            this.initThreePane(bars);
        } else if (bars.length === 1) {
            this.initTwoPane(bars[0]);
        }
    }

    initThreePane(bars) {
        const [leftBar, rightBar] = bars;

        // Store original transitions
        this.leftTransition = this.left.style.transition;
        if (this.right) this.rightTransition = this.right.style.transition;

        leftBar.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.dragging = true;
            this.activeBar = "left";
            this.startX = e.clientX;
            this.startLeftWidth = this.left.offsetWidth;

            // Disable transitions during dragging for smooth movement
            this.left.style.transition = "none";
            if (this.right) this.right.style.transition = "none";

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        });

        rightBar.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.dragging = true;
            this.activeBar = "right";
            this.startX = e.clientX;
            this.startRightWidth = this.right.offsetWidth;

            // Disable transitions during dragging for smooth movement
            this.left.style.transition = "none";
            if (this.right) this.right.style.transition = "none";

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        });

        const handleMove = (e) => {
            if (!this.dragging) return;
            const deltaX = e.clientX - this.startX;

            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                if (this.activeBar === "left") {
                    const w = this.startLeftWidth + deltaX;
                    if (w >= this.options.min && w <= this.options.max) {
                        this.left.style.width = w + "px";
                        // Dispatch custom event for left panel resize
                        this.left.dispatchEvent(new CustomEvent('splitter-resize', { 
                            detail: { width: w, panel: 'left' } 
                        }));
                    }
                } else if (this.activeBar === "right") {
                    const w = this.startRightWidth - deltaX;
                    if (w >= this.options.min && w <= this.options.max) {
                        this.right.style.width = w + "px";
                        // Dispatch custom event for right panel resize
                        this.right.dispatchEvent(new CustomEvent('splitter-resize', { 
                            detail: { width: w, panel: 'right' } 
                        }));
                    }
                }
            });
        };

        document.addEventListener("mousemove", handleMove);

        document.addEventListener("mouseup", () => {
            if (this.dragging) {
                // Re-enable transitions after dragging
                this.left.style.transition = this.leftTransition || "";
                if (this.right) this.right.style.transition = this.rightTransition || "";
            }
            this.dragging = false;
            this.activeBar = null;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        });
    }

    initTwoPane(bar) {
        // Store original transition
        this.leftTransition = this.left.style.transition;

        bar.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.dragging = true;
            this.startX = e.clientX;
            this.startLeftWidth = this.left.offsetWidth;

            // Disable transitions during dragging for smooth movement
            this.left.style.transition = "none";

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        });

        const handleMove = (e) => {
            if (!this.dragging) return;
            const deltaX = e.clientX - this.startX;
            const w = this.startLeftWidth + deltaX;

            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                if (w >= this.options.min && w <= this.options.max) {
                    this.left.style.width = w + "px";
                    // Dispatch custom event for left panel resize
                    this.left.dispatchEvent(new CustomEvent('splitter-resize', { 
                        detail: { width: w, panel: 'left' } 
                    }));
                }
            });
        };

        document.addEventListener("mousemove", handleMove);

        document.addEventListener("mouseup", () => {
            if (this.dragging) {
                // Re-enable transitions after dragging
                this.left.style.transition = this.leftTransition || "";
            }
            this.dragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        });
    }

    static createInstance(selector, options = {}) {
        return new KTSplitter(selector, options);
    }
}
