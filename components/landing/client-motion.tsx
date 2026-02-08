"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState, ReactNode } from "react";

interface ClientMotionProps {
    children: ReactNode;
    component?: string;
    [key: string]: any; // Allow motion props and DOM props
}

/**
 * A wrapper component that handles framer-motion animations safely on the client side.
 * It strictly separates SSR rendering (plain DOM) from Client rendering (motion).
 */
export function ClientMotion({
    children,
    component = "div",
    ...props
}: ClientMotionProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Motion-specific props to filter out during SSR
    const motionPropsList = [
        'initial', 'animate', 'exit', 'transition', 'variants',
        'whileHover', 'whileTap', 'whileFocus', 'whileDrag',
        'whileInView', 'viewport', 'onAnimationStart',
        'onAnimationComplete', 'onUpdate', 'onDragStart',
        'onDrag', 'onDragEnd', 'onDirectionLock',
        'onDragTransitionEnd', 'layout', 'layoutId'
    ];

    if (!isMounted) {
        const domProps: Record<string, any> = {};
        Object.keys(props).forEach(key => {
            if (!motionPropsList.includes(key)) {
                domProps[key] = props[key];
            }
        });

        const Tag = component as any;
        return <Tag {...domProps}>{children}</Tag>;
    }

    // Client-side: Dynamic access to motion components
    const MotionTag = (motion as any)[component] || motion.div;

    return <MotionTag {...props}>{children}</MotionTag>;
}
