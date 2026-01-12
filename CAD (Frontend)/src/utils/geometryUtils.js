/**
 * Geometry Utility Functions for CAD
 * Shared logic for point extraction, arc sampling, and geometry processing.
 */

/**
 * Extract ordered points from lines by walking the chain
 * @param {Array} lines - Array of line segments [[{x,y}, {x,y}], ...]
 * @param {Array} cutEdges - Optional array of indices of lines that have been cut
 */
export const extractOrderedPointsFromLines = (lines, cutEdges = []) => {
    if (!lines || lines.length === 0) return [];

    // Filter out cut edges
    const activeLines = lines.filter((_, idx) => !cutEdges.includes(idx));

    if (activeLines.length === 0) return [];

    const orderedPoints = [];
    const usedLines = new Set();

    // Start with first active line
    orderedPoints.push(activeLines[0][0]);
    orderedPoints.push(activeLines[0][1]);
    usedLines.add(0);

    // Walk the chain
    let lastPoint = activeLines[0][1];
    let changed = true;

    while (changed && usedLines.size < activeLines.length) {
        changed = false;
        for (let i = 0; i < activeLines.length; i++) {
            if (usedLines.has(i)) continue;

            const line = activeLines[i];
            const dist0 = Math.sqrt((line[0].x - lastPoint.x) ** 2 + (line[0].y - lastPoint.y) ** 2);
            const dist1 = Math.sqrt((line[1].x - lastPoint.x) ** 2 + (line[1].y - lastPoint.y) ** 2);

            if (dist0 < 0.01) {
                orderedPoints.push(line[1]);
                lastPoint = line[1];
                usedLines.add(i);
                changed = true;
                break;
            } else if (dist1 < 0.01) {
                orderedPoints.push(line[0]);
                lastPoint = line[0];
                usedLines.add(i);
                changed = true;
                break;
            }
        }
    }

    // Remove last point if it's the same as first (closed loop duplicate)
    if (orderedPoints.length > 1) {
        const first = orderedPoints[0];
        const last = orderedPoints[orderedPoints.length - 1];
        const dist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
        if (dist < 0.01) {
            orderedPoints.pop();
        }
    }

    return orderedPoints;
};

/**
 * Sample points from a sketch, handling polygons, arcs, and lines.
 * @param {Object} sketch - The sketch object
 * @returns {Array} Array of points {x, y}
 */
export const sampleSketchPoints = (sketch) => {
    if (!sketch) return [];

    if (sketch.type === 'polygon' && sketch.points) {
        const cutEdges = sketch.cutEdges || [];
        const arcEdges = sketch.arcEdges || [];

        // Check if shape is closed: no cut edges, OR all cut edges replaced with arcs
        if (cutEdges.length > 0 && cutEdges.length > arcEdges.length) {
            // Note: This logic assumes 1-to-1 replacement, which is typical for this app
            // If there are more cut edges than arc edges, it's likely open.
            // However, the caller might want points regardless of closure for preview.
            // We will proceed but this might be an open shape.
        }

        const points = sketch.points;
        const sketchPoints = [];

        // If we have arc edges, we need to sample the arcs to create a smooth profile
        if (arcEdges.length > 0) {
            // Create a map of edge index to arc edge
            const arcEdgeMap = new Map();
            arcEdges.forEach(ae => {
                if (ae.edgeIndex !== undefined) {
                    arcEdgeMap.set(ae.edgeIndex, ae);
                }
            });

            // Walk through all edges
            for (let i = 0; i < points.length; i++) {
                const p1Norm = points[i];
                const p2Norm = points[(i + 1) % points.length];

                if (arcEdgeMap.has(i)) {
                    // This edge is an arc - sample points along the quadratic bezier
                    const arcEdge = arcEdgeMap.get(i);

                    // Get the control point in normalized coordinates
                    let bezierControl;

                    if (arcEdge.controlNorm) {
                        // Use pre-computed normalized control point
                        bezierControl = arcEdge.controlNorm;
                    } else {
                        // Legacy: convert screen coords to normalized
                        // Fallback if DOM is not available or legacy sketch
                        const canvas = document.querySelector('.sketch-canvas');
                        const canvasWidth = canvas ? canvas.width : 800;
                        const canvasHeight = canvas ? canvas.height : 600;
                        const centerX = canvasWidth / 2;
                        const centerY = canvasHeight / 2;
                        const uniformScale = Math.min(centerX, centerY);

                        bezierControl = {
                            x: (arcEdge.control.x - centerX) / uniformScale,
                            y: -(arcEdge.control.y - centerY) / uniformScale
                        };
                    }

                    // Use polygon vertices as bezier start/end for correct direction
                    const bezierStart = p1Norm;
                    const bezierEnd = p2Norm;

                    // Add start point
                    sketchPoints.push(p1Norm);

                    // Sample arc using normalized coordinates
                    const SAMPLES = 8;
                    for (let t = 1; t <= SAMPLES; t++) {
                        const tNorm = t / (SAMPLES + 1);
                        const oneMinusT = 1 - tNorm;

                        // Quadratic bezier: start -> control -> end
                        const x = oneMinusT * oneMinusT * bezierStart.x + 2 * oneMinusT * tNorm * bezierControl.x + tNorm * tNorm * bezierEnd.x;
                        const y = oneMinusT * oneMinusT * bezierStart.y + 2 * oneMinusT * tNorm * bezierControl.y + tNorm * tNorm * bezierEnd.y;

                        sketchPoints.push({ x, y });
                    }
                } else {
                    // Regular line edge - just add the point
                    sketchPoints.push(p1Norm);
                }
            }
            return sketchPoints;
        } else {
            // No arc edges, use points directly
            return sketch.points;
        }
    } else if (sketch.type === 'lines' && sketch.lines) {
        const cutEdges = sketch.cutEdges || [];
        return extractOrderedPointsFromLines(sketch.lines, cutEdges);
    } else if (sketch.type === 'circles' && sketch.circles && sketch.circles.length > 0) {
        // Handle circles map to points
        // NOTE: Currently only supporting the FIRST circle for single-profile extrusion/preview
        // To support multiple circles, we would need to return an array of arrays or separate shapes
        const circle = sketch.circles[0];
        const points = [];
        const SAMPLES = 32; // Higher resolution for circles

        for (let i = 0; i < SAMPLES; i++) {
            const angle = (i / SAMPLES) * Math.PI * 2;
            points.push({
                x: circle.center.x + Math.cos(angle) * circle.radius,
                y: circle.center.y + Math.sin(angle) * circle.radius
            });
        }
        return points;
    }

    return [];
};
