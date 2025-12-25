// src/cad/CADGeometryService.js
// Service for creating and manipulating CAD geometry using OpenCascade.js

import { getOC, initOpenCascade, isOCLoaded } from './OpenCascadeLoader';

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
     * @param {number} width - Width (X dimension)
     * @param {number} height - Height (Y dimension)
     * @param {number} depth - Depth (Z dimension)
     * @param {Object} position - Center position {x, y, z}
     * @returns {Object} BREP shape
     */
    createBox(width, height, depth, position = { x: 0, y: 0, z: 0 }) {
        const oc = getOC();

        // Create box with dimensions (origin to corner)
        const box = new oc.BRepPrimAPI_MakeBox_1(width, height, depth).Shape();

        // Translate to center position
        const offsetX = position.x - width / 2;
        const offsetY = position.y - height / 2;
        const offsetZ = position.z - depth / 2;

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
            const transform = new oc.gp_Trsf_1();
            const vec = new oc.gp_Vec_4(offsetX, offsetY, offsetZ);
            transform.SetTranslation_1(vec);
            const transformer = new oc.BRepBuilderAPI_Transform_2(box, transform, false);
            return transformer.Shape();
        }

        return box;
    }

    /**
     * Create a cylinder primitive
     * @param {number} radius - Cylinder radius
     * @param {number} height - Cylinder height
     * @param {Object} position - Base center position {x, y, z}
     * @returns {Object} BREP shape
     */
    createCylinder(radius, height, position = { x: 0, y: 0, z: 0 }) {
        const oc = getOC();

        // Create axis at position
        const axis = new oc.gp_Ax2_3(
            new oc.gp_Pnt_3(position.x, position.y, position.z),
            new oc.gp_Dir_4(0, 0, 1) // Z-up
        );

        const cylinder = new oc.BRepPrimAPI_MakeCylinder_3(axis, radius, height).Shape();
        return cylinder;
    }

    /**
     * Create a sphere primitive
     * @param {number} radius - Sphere radius
     * @param {Object} position - Center position {x, y, z}
     * @returns {Object} BREP shape
     */
    createSphere(radius, position = { x: 0, y: 0, z: 0 }) {
        const oc = getOC();

        // Create sphere at origin with radius, then translate if needed
        const sphere = new oc.BRepPrimAPI_MakeSphere_1(radius).Shape();

        if (position.x !== 0 || position.y !== 0 || position.z !== 0) {
            const transform = new oc.gp_Trsf_1();
            const vec = new oc.gp_Vec_4(position.x, position.y, position.z);
            transform.SetTranslation_1(vec);
            const transformer = new oc.BRepBuilderAPI_Transform_2(sphere, transform, false);
            return transformer.Shape();
        }

        return sphere;
    }

    /**
     * Extrude a 2D profile into a 3D solid
     * @param {Array} points - Array of {x, y} points defining the profile
     * @param {number} height - Extrusion height
     * @param {Object} options - Options {direction: {x,y,z}}
     * @returns {Object} BREP shape
     */
    extrudeProfile(points, height, options = {}) {
        const oc = getOC();

        if (points.length < 3) {
            throw new Error('Profile must have at least 3 points');
        }

        // Create wire from points
        const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            const start = new oc.gp_Pnt_3(p1.x, p1.y, 0);
            const end = new oc.gp_Pnt_3(p2.x, p2.y, 0);

            const edge = new oc.BRepBuilderAPI_MakeEdge_3(start, end).Edge();
            wireBuilder.Add_1(edge);
        }

        const wire = wireBuilder.Wire();

        // Create face from wire
        const face = new oc.BRepBuilderAPI_MakeFace_15(wire, true).Face();

        // Extrude direction
        const direction = options.direction || { x: 0, y: 0, z: 1 };
        const extrudeVec = new oc.gp_Vec_4(
            direction.x * height,
            direction.y * height,
            direction.z * height
        );

        // Create extrusion
        const prism = new oc.BRepPrimAPI_MakePrism_1(face, extrudeVec, false, true);
        return prism.Shape();
    }

    /**
     * Boolean union of two shapes
     * @param {Object} shape1 - First BREP shape
     * @param {Object} shape2 - Second BREP shape
     * @returns {Object} Resulting BREP shape
     */
    booleanUnion(shape1, shape2) {
        const oc = getOC();
        const fuse = new oc.BRepAlgoAPI_Fuse_3(shape1, shape2, new oc.Message_ProgressRange_1());
        return fuse.Shape();
    }

    /**
     * Boolean subtraction (cut shape2 from shape1)
     * @param {Object} shape1 - Base BREP shape
     * @param {Object} shape2 - Tool BREP shape to subtract
     * @returns {Object} Resulting BREP shape
     */
    booleanCut(shape1, shape2) {
        const oc = getOC();
        const cut = new oc.BRepAlgoAPI_Cut_3(shape1, shape2, new oc.Message_ProgressRange_1());
        return cut.Shape();
    }

    /**
     * Boolean intersection of two shapes
     * @param {Object} shape1 - First BREP shape
     * @param {Object} shape2 - Second BREP shape
     * @returns {Object} Resulting BREP shape
     */
    booleanIntersect(shape1, shape2) {
        const oc = getOC();
        const common = new oc.BRepAlgoAPI_Common_3(shape1, shape2, new oc.Message_ProgressRange_1());
        return common.Shape();
    }

    /**
     * Convert BREP shape to Three.js compatible mesh data
     * @param {Object} shape - BREP shape
     * @returns {Object} { vertices: Float32Array, indices: Uint32Array, normals: Float32Array }
     */
    shapeToMesh(shape) {
        const oc = getOC();

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

        let indexOffset = 0;

        while (explorer.More()) {
            const face = oc.TopoDS.Face_1(explorer.Current());
            const location = new oc.TopLoc_Location_1();
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

                    // Placeholder normals (will be computed later or per-face)
                    normals.push(0, 0, 1);
                }

                // Get triangles
                const nbTriangles = triangulation.get().NbTriangles();
                for (let i = 1; i <= nbTriangles; i++) {
                    const triangle = triangulation.get().Triangle(i);
                    const n1 = triangle.Value(1) - 1 + nodeStartIndex;
                    const n2 = triangle.Value(2) - 1 + nodeStartIndex;
                    const n3 = triangle.Value(3) - 1 + nodeStartIndex;

                    // Check face orientation
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

        return {
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices),
            normals: new Float32Array(normals)
        };
    }
}

// Singleton instance
const cadGeometryService = new CADGeometryService();
export default cadGeometryService;
