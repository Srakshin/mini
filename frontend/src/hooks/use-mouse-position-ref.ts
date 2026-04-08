import {RefObject, useEffect, useRef} from "react";

export const useMousePositionRef = (
    containerRef?: RefObject<HTMLElement | SVGElement>,
) => {
    const positionRef = useRef({x: 0, y: 0});

    useEffect(() => {
        const updatePosition = (x: number, y: number) => {
            if (containerRef?.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const relativeX = x - rect.left;
                const relativeY = y - rect.top;

                positionRef.current = {x: relativeX, y: relativeY};
                return;
            }

            positionRef.current = {x, y};
        };

        const handleMouseMove = (event: MouseEvent) => {
            updatePosition(event.clientX, event.clientY);
        };

        const handleTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];

            if (touch) {
                updatePosition(touch.clientX, touch.clientY);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchmove", handleTouchMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, [containerRef]);

    return positionRef;
};
