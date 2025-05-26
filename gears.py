import FreeCAD, FreeCADGui, Part, math
from FreeCAD import Base
from PySide2 import QtWidgets, QtCore

class SpurGearGenerator(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Spur Gear Generator')
        self.setGeometry(100, 100, 350, 350)

        self.teeth_spinbox = QtWidgets.QSpinBox()
        self.teeth_spinbox.setMinimum(6)                           # Teeth Count
        self.teeth_spinbox.setMaximum(100)
        self.teeth_spinbox.setValue(30)
        self.teeth_spinbox.valueChanged.connect(self.update_gear)

        self.module_spinbox = QtWidgets.QDoubleSpinBox()
        self.module_spinbox.setMinimum(0.5)
        self.module_spinbox.setMaximum(10.0)                       # Module Value
        self.module_spinbox.setSingleStep(0.1)
        self.module_spinbox.setValue(2.0)
        self.module_spinbox.valueChanged.connect(self.update_gear)

        self.thickness_spinbox = QtWidgets.QSpinBox()
        self.thickness_spinbox.setMinimum(1)
        self.thickness_spinbox.setMaximum(20)                       # Padding Value
        self.thickness_spinbox.setValue(5)
        self.thickness_spinbox.valueChanged.connect(self.update_gear)

        self.bore_spinbox = QtWidgets.QDoubleSpinBox()
        self.bore_spinbox.setMinimum(0.1)
        self.bore_spinbox.setMaximum(50.0)                                # Bore Diameter Value
        self.bore_spinbox.setSingleStep(0.1)
        self.bore_spinbox.setValue(5.0)
        self.bore_spinbox.valueChanged.connect(self.update_gear)

        # Layout
        layout = QtWidgets.QVBoxLayout()
        layout.addWidget(QtWidgets.QLabel("Teeth Count"))
        layout.addWidget(self.teeth_spinbox)
        layout.addWidget(QtWidgets.QLabel("Module"))
        layout.addWidget(self.module_spinbox)
        layout.addWidget(QtWidgets.QLabel("Thickness (mm)"))
        layout.addWidget(self.thickness_spinbox)
        layout.addWidget(QtWidgets.QLabel("Bore Diameter (mm)"))
        layout.addWidget(self.bore_spinbox)
        self.setLayout(layout)

        self.show()
        self.update_gear()

    def create_spur_gear(self, teeth, module, thickness, bore_diameter):
        """Generates a spur gear using proper teeth distribution"""
        pitch_radius = (teeth * module) / 2
        base_radius = pitch_radius * math.cos(math.radians(20))
        outer_radius = pitch_radius + module
        root_radius = pitch_radius - 1.25 * module
        
        # Create base cylinder for gear body
        gear_body = Part.makeCylinder(outer_radius, thickness)
        
        # Create hole in center with user-defined bore diameter
        hole_radius = bore_diameter / 2
        hole = Part.makeCylinder(hole_radius, thickness)
        gear_body = gear_body.cut(hole)
        
        # Create a single tooth profile
        tooth_angle = 360 / teeth
        tooth_width = (math.pi * pitch_radius) / teeth
        tooth_shape = Part.makeBox(tooth_width, module * 2, thickness)
        tooth_shape.translate(Base.Vector(-tooth_width/2, pitch_radius - module, 0))

        # Rotate and copy teeth
        teeth_compound = []
        for i in range(teeth):
            rotated_tooth = tooth_shape.copy()
            rotated_tooth.rotate(Base.Vector(0, 0, 0), Base.Vector(0, 0, 1), i * tooth_angle)
            teeth_compound.append(rotated_tooth)

        # Fuse all teeth together
        all_teeth = teeth_compound[0]
        for t in teeth_compound[1:]:
            all_teeth = all_teeth.fuse(t)

        # Cut teeth from the gear body
        final_gear = gear_body.cut(all_teeth)
        return final_gear

    def update_gear(self):
        """Update gear when parameters change"""
        teeth = self.teeth_spinbox.value()
        module = self.module_spinbox.value()
        thickness = self.thickness_spinbox.value()
        bore_diameter = self.bore_spinbox.value()

        if FreeCAD.ActiveDocument is None:
            FreeCAD.newDocument("GearDesign")
        else:
            for obj in FreeCAD.ActiveDocument.Objects:
                FreeCAD.ActiveDocument.removeObject(obj.Name)

        gear = self.create_spur_gear(teeth, module, thickness, bore_diameter)
        Part.show(gear)
        FreeCAD.ActiveDocument.recompute()

# Run in FreeCAD
tool = SpurGearGenerator()