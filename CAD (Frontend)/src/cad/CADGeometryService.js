// src/cad/CADGeometryService.js
// Service for creating and manipulating CAD geometry using OpenCascade.js

import { getOC, initOpenCascade, isOCLoaded } from './OpenCascadeLoader';

/**
 * Helper to safely delete OpenCascade objects
 */
const safeDelete = (...objects) => {
    objects.forEach(obj => {
        try {
            if (obj && typeof obj.delete === 'function') {
                obj.delete();
            }
        } catch (e) {
            // Ignore deletion errors
        }
    });
};

/**
 * CAD Geometry Service
 * Provides high-level CAD operations using OpenCascade kernel
 */
class CADGeometryService {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * Initialize the CAD service
     */
    async init() {
        if (this.isInitialized) return;
        await initOpenCascade();
        this.isInitialized = true;
    }

    /**
     * Create a box primitive
     */
    createBox(width, height, depth, position = { x: 0, y: 0, z: 0 }) {
        const oc = getOC();
        let box = null, transform = null, vec = null, transformer = null, result = null;

        try {
            const maker = new oc.BRepPrimAPI_MakeBox_1(width, height, depth);
            box = maker.Shape();

            const offsetX = position.x - width / 2;
            const offsetY = position.y - height / 2;
            const offsetZ = position.z - depth / 2;

            if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
                transform = new oc.gp_Trsf_1();
                vec = new oc.gp_Vec_4(offsetX, offsetY, offsetZ);
                transform.SetTranslation_1(vec);
                transformer = new oc.BRepBuilderAPI_Transform_2(box, transform, false);
                result = transformer.Shape();
                safeDelete(box, transform, vec);
                return result;
            }

            return box;
        } catch (err) {
            safeDelete(box, transform, vec, transformer, result);
            throw new Error(`Failed to create box: ${err.message}`);
        }
    }

    /**
     * Create a cylinder primitive
     */
    createCylinder(radius, height, position = { x: 0, y: 0, z: 0 }) {
        const oc = getOC();
        let axis = null, origin = null, direction = null;

        try {
            origin = new oc.gp_Pnt_3(position.x, position.y, position.z);
            direction = new oc.gp_Dir_4(0, 0, 1);
            axis = new oc.gp_Ax2_3(origin, direction);

            const maker = new oc.BRepPrimAPI_MakeCylinder_3(axis, radius, height);
            const cylinder = maker.Shape();

            safeDelete(axis, origin, direction);
            return cylinder;
        } catch (err) {
            safeDelete(axis, origin, direction);
            throw new Error(`Failed to create cylinder: ${err.message}`);
        }
    }

    /**
     * Create a sphere primitive
     */
    createSphere(radius, position = { x: 0, y: 0, z: 0 }) {
        const oc = getOC();
        let sphere = null, transform = null, vec = null, transformer = null;

        try {
            const maker = new oc.BRepPrimAPI_MakeSphere_1(radius);
            sphere = maker.Shape();

            if (position.x !== 0 || position.y !== 0 || position.z !== 0) {
                transform = new oc.gp_Trsf_1();
                vec = new oc.gp_Vec_4(position.x, position.y, position.z);
                transform.SetTranslation_1(vec);
                transformer = new oc.BRepBuilderAPI_Transform_2(sphere, transform, false);
                const result = transformer.Shape();
                safeDelete(sphere, transform, vec);
                return result;
            }

            return sphere;
        } catch (err) {
            safeDelete(sphere, transform, vec, transformer);
            throw new Error(`Failed to create sphere: ${err.message}`);
        }
    }

    /**
     * Validate polygon points for extrusion
     */
    validatePolygon(points) {
        if (points.length < 3) {
            return { valid: false, error: 'Profile must have at least 3 points' };
        }

        // Check for duplicate consecutive points (but NOT first vs last - that's how polygons close)
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
            if (dist < 0.001) {
                return { valid: false, error: 'Polygon has duplicate consecutive points' };
            }
        }

        // Basic self-intersection check (simplified - checks crossing edges)
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 2; j < points.length; j++) {
                if (i === 0 && j === points.length - 1) continue; // Skip adjacent edges

                const a = points[i];
                const b = points[(i + 1) % points.length];
                const c = points[j];
                const d = points[(j + 1) % points.length];

                if (this.segmentsIntersect(a, b, c, d)) {
                    return { valid: false, error: 'Polygon is self-intersecting' };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Check if two line segments intersect
     */
    segmentsIntersect(a, b, c, d) {
        const ccw = (p1, p2, p3) => {
            return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
        };
        return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
    }

    /**
     * Extrude a 2D profile into a 3D solid
     */
    extrudeProfile(points, height, options = {}) {
        const oc = getOC();

        // Validate height
        if (height <= 0) {
            throw new Error('Extrusion height must be positive');
        }

        // Validate polygon
        const validation = this.validatePolygon(points);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const toDelete = [];

        try {
            // Create wire from points
            const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();

            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];

                const start = new oc.gp_Pnt_3(p1.x, p1.y, 0);
                const end = new oc.gp_Pnt_3(p2.x, p2.y, 0);
                toDelete.push(start, end);

                const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_3(start, end);
                const edge = edgeMaker.Edge();
                wireBuilder.Add_1(edge);
            }

            const wire = wireBuilder.Wire();

            // Create face from wire
            const faceMaker = new oc.BRepBuilderAPI_MakeFace_15(wire, true);
            const face = faceMaker.Face();

            // Extrude direction
            const direction = options.direction || { x: 0, y: 0, z: 1 };
            const extrudeVec = new oc.gp_Vec_4(
                direction.x * height,
                direction.y * height,
                direction.z * height
            );
            toDelete.push(extrudeVec);

            // Create extrusion
            const prism = new oc.BRepPrimAPI_MakePrism_1(face, extrudeVec, false, true);
            const result = prism.Shape();

            // Cleanup temporary objects
            safeDelete(...toDelete);

            return result;
        } catch (err) {
            safeDelete(...toDelete);
            throw new Error(`Extrusion failed: ${err.message}`);
        }
    }

    /**
     * Boolean union of two shapes
     */
    booleanUnion(shape1, shape2) {
        const oc = getOC();
        let progress = null;

        try {
            progress = new oc.Message_ProgressRange_1();
            const fuse = new oc.BRepAlgoAPI_Fuse_3(shape1, shape2, progress);
            const result = fuse.Shape();
            safeDelete(progress);
            return result;
        } catch (err) {
            safeDelete(progress);
            throw new Error(`Boolean union failed: ${err.message}`);
        }
    }

    /**
     * Boolean subtraction
     */
    booleanCut(shape1, shape2) {
        const oc = getOC();
        let progress = null;

        try {
            progress = new oc.Message_ProgressRange_1();
            const cut = new oc.BRepAlgoAPI_Cut_3(shape1, shape2, progress);
            const result = cut.Shape();
            safeDelete(progress);
            return result;
        } catch (err) {
            safeDelete(progress);
            throw new Error(`Boolean cut failed: ${err.message}`);
        }
    }

    /**
     * Boolean intersection
     */
    booleanIntersect(shape1, shape2) {
        const oc = getOC();
        let progress = null;

        try {
            progress = new oc.Message_ProgressRange_1();
            const common = new oc.BRepAlgoAPI_Common_3(shape1, shape2, progress);
            const result = common.Shape();
            safeDelete(progress);
            return result;
        } catch (err) {
            safeDelete(progress);
            throw new Error(`Boolean intersection failed: ${err.message}`);
        }
    }

    /**
     * Convert BREP shape to Three.js compatible mesh data
     */
    shapeToMesh(shape) {
        const oc = getOC();
        const toDelete = [];

        try {
            // Mesh the shape
            new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.5, true);

            const vertices = [];
            const indices = [];
            const normals = [];

            // Iterate over faces
            const explorer = new oc.TopExp_Explorer_2(
                shape,
                oc.TopAbs_ShapeEnum.TopAbs_FACE,
                oc.TopAbs_ShapeEnum.TopAbs_SHAPE
            );
            toDelete.push(explorer);

            while (explorer.More()) {
                const face = oc.TopoDS.Face_1(explorer.Current());
                const location = new oc.TopLoc_Location_1();
                toDelete.push(location);

                const triangulation = oc.BRep_Tool.Triangulation(face, location);

                if (!triangulation.IsNull()) {
                    const transform = location.Transformation();

                    // Get nodes (vertices)
                    const nbNodes = triangulation.get().NbNodes();
                    const nodeStartIndex = vertices.length / 3;

                    for (let i = 1; i <= nbNodes; i++) {
                        const node = triangulation.get().Node(i);
                        const transformedNode = node.Transformed(transform);
                        vertices.push(transformedNode.X(), transformedNode.Y(), transformedNode.Z());
                        normals.push(0, 0, 1);
                    }

                    // Get triangles
                    const nbTriangles = triangulation.get().NbTriangles();
                    for (let i = 1; i <= nbTriangles; i++) {
                        const triangle = triangulation.get().Triangle(i);
                        const n1 = triangle.Value(1) - 1 + nodeStartIndex;
                        const n2 = triangle.Value(2) - 1 + nodeStartIndex;
                        const n3 = triangle.Value(3) - 1 + nodeStartIndex;

                        const orientation = face.Orientation_1();
                        if (orientation === oc.TopAbs_Orientation.TopAbs_REVERSED) {
                            indices.push(n1, n3, n2);
                        } else {
                            indices.push(n1, n2, n3);
                        }
                    }
                }

                explorer.Next();
            }

            safeDelete(...toDelete);

            return {
                vertices: new Float32Array(vertices),
                indices: new Uint32Array(indices),
                normals: new Float32Array(normals)
            };
        } catch (err) {
            safeDelete(...toDelete);
            throw new Error(`Mesh conversion failed: ${err.message}`);
        }
    }
}

// Singleton instance
const cadGeometryService = new CADGeometryService();
export default cadGeometryService;
