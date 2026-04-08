"use client";

import {
    createContext,
    type HTMLAttributes,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
} from "react";
import {useAnimationFrame} from "motion/react";
import {cn} from "@/lib/utils";
import {useMousePositionRef} from "@/hooks/use-mouse-position-ref";

interface FloatingContextType {
    registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
    unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextType | null>(null);

interface FloatingProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    sensitivity?: number;
    easingFactor?: number;
}

const Floating = ({
    children,
    className,
    sensitivity = 1,
    easingFactor = 0.05,
    ...props
}: FloatingProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const elementsMap = useRef(new Map<string, {
        element: HTMLDivElement;
        depth: number;
        currentPosition: {x: number; y: number};
    }>());
    const mousePositionRef = useMousePositionRef(containerRef);

    const registerElement = useCallback((id: string, element: HTMLDivElement, depth: number) => {
        elementsMap.current.set(id, {
            element,
            depth,
            currentPosition: {x: 0, y: 0},
        });
    }, []);

    const unregisterElement = useCallback((id: string) => {
        elementsMap.current.delete(id);
    }, []);

    useAnimationFrame(() => {
        if (!containerRef.current) {
            return;
        }

        elementsMap.current.forEach((data) => {
            const strength = (data.depth * sensitivity) / 20;
            const targetX = mousePositionRef.current.x * strength;
            const targetY = mousePositionRef.current.y * strength;
            const deltaX = targetX - data.currentPosition.x;
            const deltaY = targetY - data.currentPosition.y;

            data.currentPosition.x += deltaX * easingFactor;
            data.currentPosition.y += deltaY * easingFactor;

            data.element.style.transform = `translate3d(${data.currentPosition.x}px, ${data.currentPosition.y}px, 0)`;
        });
    });

    return (
        <FloatingContext.Provider value={{registerElement, unregisterElement}}>
            <div
                ref={containerRef}
                className={cn("absolute left-0 top-0 h-full w-full", className)}
                {...props}
            >
                {children}
            </div>
        </FloatingContext.Provider>
    );
};

interface FloatingElementProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    depth?: number;
}

export const FloatingElement = ({
    children,
    className,
    depth = 1,
    ...props
}: FloatingElementProps) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(Math.random().toString(36).substring(7));
    const context = useContext(FloatingContext);

    useEffect(() => {
        if (!elementRef.current || !context) {
            return;
        }

        const nonNullDepth = depth ?? 0.01;

        context.registerElement(idRef.current, elementRef.current, nonNullDepth);

        return () => {
            context.unregisterElement(idRef.current);
        };
    }, [context, depth]);

    return (
        <div
            ref={elementRef}
            className={cn("absolute will-change-transform", className)}
            {...props}
        >
            {children}
        </div>
    );
};

export default Floating;
