/**
 * Created by Liad Guttmann on 03/10/2020.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * (c) www.geocento.com
 * www.metaaps.com
 *
 */

var _currentSurface;
var RulerCount = 1;
var rulerEdgesToSave;
var positionForLabel = [];
var isEditMode = false;
var currPoly;
var liad = 0;

// startDrawHelper("polygonButtonContainer" , ['polygon'])
//"polygonButtonContainer" - the id of the buttons container
//['polygon'] - array of buttons you want to create in the current container

function startDrawHelper(innerContainer, buttonsArray) {
    // create the almighty cesium widget
    //var cesiumWidget = new Cesium.CesiumWidget('cesiumContainer', { scene3DOnly: false });
    //var scene = cesiumWidget.scene;
    // start the draw helper to enable shape creation and editing
    var currButtons = ['marker', 'polyline', 'polygon', 'circle', 'extent', 'ellipse', 'ruler'];
    var drawHelper = new DrawHelper(viewer);
    if (buttonsArray != undefined) {
        currButtons = buttonsArray;
    }
    var toolbar = drawHelper.addToolbar(document.getElementById("toolbar"), {
        buttons: currButtons
    }, innerContainer);
    toolbar.addListener('markerCreated', function (event) {
        loggingMessage('Marker created at ' + event.position.toString());
        // create one common billboard collection for all billboards
        var b = new Cesium.BillboardCollection();
        scene.primitives.add(b);
        var billboard = b.add({
            show: true,
            position: event.position,
            pixelOffset: new Cesium.Cartesian2(0, 0),
            eyeOffset: new Cesium.Cartesian3(0.0, 0.0, 0.0),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            scale: 1.0,
            image: './img/glyphicons_242_google_maps.png',
            color: new Cesium.Color(245.0, 41.0, 141.0, 0.8)
        });
        billboard.setEditable();
    });
    toolbar.addListener('polylineCreated', function (event) { //after double click
        loggingMessage('Polyline created with ' + event.positions.length + ' points');
        for (var i = 0; i < event.positions; i++) {
            //draw dot
        }
        var polyline = new DrawHelper.PolylinePrimitive({
            positions: event.positions,
            width: 5,
            geodesic: true,
            material: Cesium.Material.fromType('PolylineGlow'),
        });
        polyline.positions.splice(-2);
        scene.primitives.add(polyline);
        polyline.setEditable();
        polyline.addListener('onEdited', function (event) {
            loggingMessage('Polyline edited, ' + event.positions.length + ' points');
        });
        _currentSurface = polyline;

    });

    toolbar.addListener('rulerCreated', function (event) { //after double click
        loggingMessage('Ruler created with ' + event.positions.length + ' points');
        for (var i = 0; i < event.positions; i++) {
            //draw dot
        }
        var ruler = new DrawHelper.RulerPolylinePrimitive({
            positions: event.positions,
            width: 2,
            type: "Ruler",
            key: `${RulerCount++}_Ruler`,
            geodesic: true,
            material: materialGridForRuler,
            //material: Cesium.Material.fromType('materialGridForRuler'),
        });
        ruler.positions.splice(-2);
        scene.primitives.add(ruler);
        positionForLabel = ruler.positions;
        ruler.setEditable();
        //ruler.addListener('onEdited', function (event) {
        //    loggingMessage('Ruler edited, ' + event.positions.length + ' points');
        //});
        _currentSurface = ruler;

    });
    toolbar.addListener('polygonCreated', function (event) {
        loggingMessage('Polygon created with ' + event.positions.length + ' points');
        var polygon = new DrawHelper.PolygonPrimitive({
            positions: event.positions,
            material: materialYellowGrid
        });
        scene.primitives.add(polygon);
        polygon.setEditable();
        polygon.addListener('onEdited', function (event) {
            loggingMessage('Polygon edited, ' + event.positions.length + ' points');
        });
        _currentSurface = polygon;

    });
    toolbar.addListener('circleCreated', function (event) {
        loggingMessage('Circle created: center is ' + event.center.toString() + ' and radius is ' + event.radius.toFixed(1) + ' meters');
        var circle = new DrawHelper.CirclePrimitive({
            center: event.center,
            radius: event.radius,
            material: materialRedGrid
        });
        scene.primitives.add(circle);
        circle.setEditable();
        circle.addListener('onEdited', function (event) {
            loggingMessage('Circle edited: radius is ' + event.radius.toFixed(1) + ' meters');
        });
        _currentSurface = circle;
    });
    toolbar.addListener('extentCreated', function (event) {
        var extent = event.extent;
        loggingMessage('Extent created (N: ' + extent.north.toFixed(3) + ', E: ' + extent.east.toFixed(3) + ', S: ' + extent.south.toFixed(3) + ', W: ' + extent.west.toFixed(3) + ')');
        var extentPrimitive = new DrawHelper.ExtentPrimitive({
            extent: extent,
            material: materialGreenGrid
        });
        scene.primitives.add(extentPrimitive);
        extentPrimitive.setEditable();
        extentPrimitive.addListener('onEdited', function (event) {
            loggingMessage('Extent edited: extent is (N: ' + event.extent.north.toFixed(3) + ', E: ' + event.extent.east.toFixed(3) + ', S: ' + event.extent.south.toFixed(3) + ', W: ' + event.extent.west.toFixed(3) + ')');
        });
        _currentSurface = extent;
    });

    toolbar.addListener('ellipseCreated', function (event) {
        var ellipse = new DrawHelper.EllipsePrimitive({
            center: event.center,
            semiMajorAxis: event.semiMajorAxis,
            semiMinorAxis: event.semiMinorAxis,
            rotation: event.rotation,
            material: materialBlueGrid
        });
        scene.primitives.add(ellipse);
        ellipse.setEditable();
        ellipse.addListener('onEdited', function (event) {
        });
        _currentSurface = ellipse;
    });
    var logging = document.getElementById('logging');
    function loggingMessage(message) {
        logging.innerHTML = message;
    }

}


var DrawHelper = (function () {

    // static variables
    var ellipsoid = Cesium.Ellipsoid.WGS84;

    // constructor
    function _(cesiumWidget) {
        this._scene = cesiumWidget.scene;
        this._tooltip = createTooltip(cesiumWidget.container);
        this._surfaces = [];

        this.initialiseHandlers();

        this.enhancePrimitives();

    }

    _.prototype.initialiseHandlers = function () {
        var scene = this._scene;
        var _self = this;
        // scene events
        var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        function callPrimitiveCallback(name, position) {
            if (_self._handlersMuted == true) return;
            var pickedObject = scene.pick(position);
            if (pickedObject && pickedObject.primitive && pickedObject.primitive[name]) {
                pickedObject.primitive[name](position);
            }
        }
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftClick', movement.position);
            }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        handler.setInputAction(
            function (movement) {
                var pick = viewer.scene.pick(movement.position);
                if (pick != undefined && pick != null) {
                    if (pick.id != undefined && pick.id.kml == undefined) {
                        if ((pick.primitive.key != undefined && pick.primitive.key.includes("Ruler")) || (pick.id != undefined && pick.id.type == "RulerLabel")) {
                            //create a button to delete
                            if (pick.primitive.type == "Ruler") {
                                var rulerToRemove = scene.primitives._primitives.find(x => x.key == pick.primitive.key);
                            }
                            else {
                                var rulerToRemove = primitives._primitives.find(x => x.key == pick.id.parentId);
                            }
                            primitives.remove(rulerToRemove);
                            var labelsToRemove = entities._entities.values.filter(x => x.parentId == pick.id.parentId)
                            if (labelsToRemove) {
                                for (var i = 0; i < labelsToRemove.length; i++) {
                                    viewer.entities.removeById(labelsToRemove[i].id);
                                }
                            }
                        }
                    }
                    //else {
                    //    //var tempLabel = entities._entities.values[entities._entities.values.length -1];
                    //    //var windowCoordinates = new Cesium.Cartesian2();
                    //    //Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, tempLabel.position._value, windowCoordinates);
                    //    debugger
                    //}
                }
                //window.confirm("sometext");
                //if (confirm) {
                //    deleteRuler(pick);
                //}
                //callPrimitiveCallback('rightClick', movement.position);
            }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftDoubleClick', movement.position);
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        var mouseOutObject;
        handler.setInputAction(
            function (movement) {
                if (_self._handlersMuted == true) return;
                var pickedObject = scene.pick(movement.endPosition);
                if (mouseOutObject && (!pickedObject || mouseOutObject != pickedObject.primitive)) {
                    !(mouseOutObject.isDestroyed && mouseOutObject.isDestroyed()) && mouseOutObject.mouseOut(movement.endPosition);
                    mouseOutObject = null;
                }
                if (pickedObject && pickedObject.primitive) {
                    pickedObject = pickedObject.primitive;
                    if (pickedObject.mouseOut) {
                        mouseOutObject = pickedObject;
                    }
                    if (pickedObject.mouseMove) {
                        pickedObject.mouseMove(movement.endPosition);
                    }
                }
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftUp', movement.position);
            }, Cesium.ScreenSpaceEventType.LEFT_UP);
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftDown', movement.position);
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    }

    _.prototype.setListener = function (primitive, type, callback) {
        primitive[type] = callback;
    }

    _.prototype.muteHandlers = function (muted) {
        this._handlersMuted = muted;
    }

    // register event handling for an editable shape
    // shape should implement setEditMode and setHighlighted
    _.prototype.registerEditableShape = function (surface) {
        var _self = this;

        // handlers for interactions
        // highlight polygon when mouse is entering
        //setListener(surface, 'mouseMove', function(position) {
        //    //surface.setHighlighted(true);
        //    if(!surface._editMode) {
        //        _self._tooltip.showAt(position, "Click to edit this shape");
        //    }
        //});
        // hide the highlighting when mouse is leaving the polygon
        setListener(surface, 'mouseOut', function (position) {
            //surface.setHighlighted(false);
            _self._tooltip.setVisible(false);
        });
        //setListener(surface, 'leftClick', function (position) {
        //    startEditMode(surface);
        //});
    }

    _.prototype.startDrawing = function (cleanUp) {
        // undo any current edit of shapes
        this.disableAllEditMode();
        // check for cleanUp first
        if (this.editCleanUp) {
            this.editCleanUp();
        }
        this.editCleanUp = cleanUp;
        this.muteHandlers(true);
    }

    _.prototype.stopDrawing = function () {
        // check for cleanUp first
        if (this.editCleanUp) {
            this.editCleanUp();
            this.editCleanUp = null;
        }
        this.muteHandlers(false);
    }

    // make sure only one shape is highlighted at a time
    _.prototype.disableAllHighlights = function () {
        this.setHighlighted(undefined);
    }

    _.prototype.setHighlighted = function (surface) {
        if (this._highlightedSurface && !this._highlightedSurface.isDestroyed() && this._highlightedSurface != surface) {
            this._highlightedSurface.setHighlighted(false);
        }
        this._highlightedSurface = surface;
    }

    _.prototype.disableAllEditMode = function () {
        this.setEdited(undefined);
    }

    _.prototype.setEdited = function (surface) {
        if (this._editedSurface && !this._editedSurface.isDestroyed()) {
            this._editedSurface.setEditMode(false);
        }
        this._editedSurface = surface;
    }

    var material = Cesium.Material.fromType(Cesium.Material.ColorType);
    material.uniforms.color = new Cesium.Color(0.0, 0.0, 0.0, 1.0);

    var defaultShapeOptions = {
        ellipsoid: Cesium.Ellipsoid.WGS84,
        textureRotationAngle: 0.0,
        height: 0.0,
        asynchronous: true,
        show: true,
        debugShowBoundingVolume: false
    }

    var defaultSurfaceOptions = copyOptions(defaultShapeOptions, {
        appearance: new Cesium.EllipsoidSurfaceAppearance({
            aboveGround: false
        }),
        material: material,
        granularity: Math.PI / 180.0
    });

    var defaultPolygonOptions = copyOptions(defaultShapeOptions, {});
    var defaultExtentOptions = copyOptions(defaultShapeOptions, {});
    var defaultCircleOptions = copyOptions(defaultShapeOptions, {});
    var defaultEllipseOptions = copyOptions(defaultSurfaceOptions, { rotation: 0 });

    var defaultPolylineOptions = copyOptions(defaultShapeOptions, {
        width: 3,
        geodesic: true,
        granularity: 10000,
        appearance: new Cesium.PolylineMaterialAppearance({
            aboveGround: false
        }),
        material: material
    });

    var defaultRulerPolylineOptions = copyOptions(defaultShapeOptions, {
        width: 3,
        geodesic: true,
        granularity: 10000,
        appearance: new Cesium.PolylineMaterialAppearance({
            aboveGround: false
        }),
        material: material,
    });



    //    Cesium.Polygon.prototype.setStrokeStyle = setStrokeStyle;
    //    
    //    Cesium.Polygon.prototype.drawOutline = drawOutline;
    //

    var ChangeablePrimitive = (function () {
        function _() {
        }

        _.prototype.initialiseOptions = function (options) {

            fillOptions(this, options);

            this._ellipsoid = undefined;
            this._granularity = undefined;
            this._height = undefined;
            this._textureRotationAngle = undefined;
            this._id = undefined;

            // set the flags to initiate a first drawing
            this._createPrimitive = true;
            this._primitive = undefined;
            this._outlinePolygon = undefined;

        }

        _.prototype.setAttribute = function (name, value) {
            this[name] = value;
            this._createPrimitive = true;
        };

        _.prototype.getAttribute = function (name) {
            return this[name];
        };

        /**
         * @private
         */
        _.prototype.update = function (context, frameState, commandList) {

            if (!Cesium.defined(this.ellipsoid)) {
                throw new Cesium.DeveloperError('this.ellipsoid must be defined.');
            }

            if (!Cesium.defined(this.appearance)) {
                throw new Cesium.DeveloperError('this.material must be defined.');
            }

            if (this.granularity < 0.0) {
                throw new Cesium.DeveloperError('this.granularity and scene2D/scene3D overrides must be greater than zero.');
            }

            if (!this.show) {
                return;
            }

            if (!this._createPrimitive && (!Cesium.defined(this._primitive))) {
                // No positions/hierarchy to draw
                return;
            }

            if (this._createPrimitive ||
                (this._ellipsoid !== this.ellipsoid) ||
                (this._granularity !== this.granularity) ||
                (this._height !== this.height) ||
                (this._textureRotationAngle !== this.textureRotationAngle) ||
                (this._id !== this.id)) {

                var geometry = this.getGeometry();
                if (!geometry) {
                    return;
                }

                this._createPrimitive = false;
                this._ellipsoid = this.ellipsoid;
                this._granularity = this.granularity;
                this._height = this.height;
                this._textureRotationAngle = this.textureRotationAngle;
                this._id = this.id;

                this._primitive = this._primitive && this._primitive.destroy();

                this._primitive = new Cesium.Primitive({
                    geometryInstances: new Cesium.GeometryInstance({
                        geometry: geometry,
                        id: this.id,
                        pickPrimitive: this
                    }),
                    appearance: this.appearance,
                    asynchronous: this.asynchronous
                });

                this._outlinePolygon = this._outlinePolygon && this._outlinePolygon.destroy();
                if (this.strokeColor && this.getOutlineGeometry) {
                    // create the highlighting frame
                    this._outlinePolygon = new Cesium.Primitive({
                        geometryInstances: new Cesium.GeometryInstance({
                            geometry: this.getOutlineGeometry(),
                            attributes: {
                                color: Cesium.ColorGeometryInstanceAttribute.fromColor(this.strokeColor)
                            }
                        }),
                        appearance: new Cesium.PerInstanceColorAppearance({
                            flat: true,
                            renderState: {
                                depthTest: {
                                    enabled: true
                                },
                                lineWidth: Math.min(this.strokeWidth || 4.0)
                            }
                        })
                    });
                }
            }

            var primitive = this._primitive;
            primitive.appearance.material = this.material;
            primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
            primitive.update(context, frameState, commandList);
            this._outlinePolygon && this._outlinePolygon.update(context, frameState, commandList);

        };

        _.prototype.isDestroyed = function () {
            return false;
        };

        _.prototype.destroy = function () {
            this._primitive = this._primitive && this._primitive.destroy();
            return Cesium.destroyObject(this);
        };

        _.prototype.setStrokeStyle = function (strokeColor, strokeWidth) {
            if (!this.strokeColor || !this.strokeColor.equals(strokeColor) || this.strokeWidth != strokeWidth) {
                this._createPrimitive = true;
                this.strokeColor = strokeColor;
                this.strokeWidth = strokeWidth;
            }
        }

        return _;
    })();

    _.ExtentPrimitive = (function () {
        function _(options) {

            if (!Cesium.defined(options.extent)) {
                throw new Cesium.DeveloperError('Extent is required');
            }

            options = copyOptions(options, defaultSurfaceOptions);

            this.initialiseOptions(options);

            this.setExtent(options.extent);

        }

        _.prototype = new ChangeablePrimitive();

        _.prototype.setExtent = function (extent) {
            this.setAttribute('extent', extent);
        };

        _.prototype.getExtent = function () {
            return this.getAttribute('extent');
        };

        _.prototype.getGeometry = function () {

            if (!Cesium.defined(this.extent)) {
                return;
            }

            return new Cesium.RectangleGeometry({
                rectangle: this.extent,
                height: this.height,
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                stRotation: this.textureRotationAngle,
                ellipsoid: this.ellipsoid,
                granularity: this.granularity
            });
        };

        _.prototype.getOutlineGeometry = function () {
            return new Cesium.RectangleOutlineGeometry({
                rectangle: this.extent
            });
        }

        return _;
    })();

    _.PolygonPrimitive = (function () {

        function _(options) {

            options = copyOptions(options, defaultSurfaceOptions);

            this.initialiseOptions(options);

            this.isPolygon = true;

        }

        _.prototype = new ChangeablePrimitive();

        _.prototype.setPositions = function (positions) {
            this.setAttribute('positions', positions);
        };

        _.prototype.getPositions = function () {
            return this.getAttribute('positions');
        };

        _.prototype.getGeometry = function () {

            if (!Cesium.defined(this.positions) || this.positions.length < 3) {
                return;
            }

            return Cesium.PolygonGeometry.fromPositions({
                positions: this.positions,
                height: this.height,
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                stRotation: this.textureRotationAngle,
                ellipsoid: this.ellipsoid,
                granularity: this.granularity
            });
        };

        _.prototype.getOutlineGeometry = function () {
            return Cesium.PolygonOutlineGeometry.fromPositions({
                positions: this.getPositions()
            });
        }

        return _;
    })();

    _.CirclePrimitive = (function () {

        function _(options) {

            if (!(Cesium.defined(options.center) && Cesium.defined(options.radius))) {
                throw new Cesium.DeveloperError('Center and radius are required');
            }

            options = copyOptions(options, defaultSurfaceOptions);

            this.initialiseOptions(options);

            this.setRadius(options.radius);

        }

        _.prototype = new ChangeablePrimitive();

        _.prototype.setCenter = function (center) {
            this.setAttribute('center', center);
        };

        _.prototype.setRadius = function (radius) {
            this.setAttribute('radius', Math.max(0.1, radius));
        };

        _.prototype.getCenter = function () {
            return this.getAttribute('center');
        };

        _.prototype.getRadius = function () {
            return this.getAttribute('radius');
        };

        _.prototype.getGeometry = function () {

            if (!(Cesium.defined(this.center) && Cesium.defined(this.radius))) {
                return;
            }

            return new Cesium.CircleGeometry({
                center: this.center,
                radius: this.radius,
                height: this.height,
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                stRotation: this.textureRotationAngle,
                ellipsoid: this.ellipsoid,
                granularity: this.granularity
            });
        };

        _.prototype.getOutlineGeometry = function () {
            return new Cesium.CircleOutlineGeometry({
                center: this.getCenter(),
                radius: this.getRadius()
            });
        }

        return _;
    })();

    _.EllipsePrimitive = (function () {
        function _(options) {

            if (!(Cesium.defined(options.center) && Cesium.defined(options.semiMajorAxis) && Cesium.defined(options.semiMinorAxis))) {
                throw new Cesium.DeveloperError('Center and semi major and semi minor axis are required');
            }

            options = copyOptions(options, defaultEllipseOptions);

            this.initialiseOptions(options);

        }

        _.prototype = new ChangeablePrimitive();

        _.prototype.setCenter = function (center) {
            this.setAttribute('center', center);
        };

        _.prototype.setSemiMajorAxis = function (semiMajorAxis) {
            if (semiMajorAxis < this.getSemiMinorAxis()) return;
            this.setAttribute('semiMajorAxis', semiMajorAxis);
        };

        _.prototype.setSemiMinorAxis = function (semiMinorAxis) {
            if (semiMinorAxis > this.getSemiMajorAxis()) return;
            this.setAttribute('semiMinorAxis', semiMinorAxis);
        };

        _.prototype.setRotation = function (rotation) {
            return this.setAttribute('rotation', rotation);
        };

        _.prototype.setStrokeWidth = function (strokeWidth) {
            return this.setAttribute('strokeWidth', strokeWidth);
        };

        _.prototype.setOutlineWidth = function (outlineWidth) {
            return this.setAttribute('outlineWidth', outlineWidth);
        };

        _.prototype.getCenter = function () {
            return this.getAttribute('center');
        };

        _.prototype.getSemiMajorAxis = function () {
            return this.getAttribute('semiMajorAxis');
        };

        _.prototype.getSemiMinorAxis = function () {
            return this.getAttribute('semiMinorAxis');
        };

        _.prototype.getRotation = function () {
            return this.getAttribute('rotation');
        };

        _.prototype.getStrokeWidth = function () {
            return this.getAttribute('strokeWidth');
        }

        _.prototype.getOutlineWidth = function () {
            return this.getAttribute('outlineWidth');
        }

        _.prototype.getGeometry = function () {

            if (!(Cesium.defined(this.center) && Cesium.defined(this.semiMajorAxis) && Cesium.defined(this.semiMinorAxis))) {
                return;
            }

            return new Cesium.EllipseGeometry({
                ellipsoid: this.ellipsoid,
                center: this.center,
                semiMajorAxis: this.semiMajorAxis,
                semiMinorAxis: this.semiMinorAxis,
                rotation: this.rotation,
                height: this.height,
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                stRotation: this.textureRotationAngle,
                ellipsoid: this.ellipsoid,
                granularity: this.granularity
            });
        };

        _.prototype.getOutlineGeometry = function () {
            return new Cesium.EllipseOutlineGeometry({
                center: this.getCenter(),
                semiMajorAxis: this.getSemiMajorAxis(),
                semiMinorAxis: this.getSemiMinorAxis(),
                rotation: this.getRotation(),
                strokeWidth: this.getStrokeWidth(),
                outlineWidth: this.getOutlineWidth()
            });
        }

        return _;
    })();

    _.PolylinePrimitive = (function () {

        function _(options) {

            options = copyOptions(options, defaultPolylineOptions);

            this.initialiseOptions(options);

        }

        _.prototype = new ChangeablePrimitive();

        _.prototype.setPositions = function (positions) {
            this.setAttribute('positions', positions);
        };

        _.prototype.setWidth = function (width) {
            this.setAttribute('width', width);
        };

        _.prototype.setGeodesic = function (geodesic) {
            this.setAttribute('geodesic', geodesic);
        };

        _.prototype.getPositions = function () {
            return this.getAttribute('positions');
        };

        _.prototype.getWidth = function () {
            return this.getAttribute('width');
        };

        _.prototype.getGeodesic = function (geodesic) {
            return this.getAttribute('geodesic');
        };

        _.prototype.getGeometry = function () {

            if (!Cesium.defined(this.positions) || this.positions.length < 2) {
                return;
            }

            return new Cesium.PolylineGeometry({
                positions: this.positions,
                height: this.height,
                width: this.width < 1 ? 1 : this.width,
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                ellipsoid: this.ellipsoid
            });
        }

        return _;
    })();

    _.RulerPolylinePrimitive = (function () {
        function _(options) {

            options = copyOptions(options, defaultRulerPolylineOptions);

            this.initialiseOptions(options);

        }

        _.prototype = new ChangeablePrimitive();

        _.prototype.setPositions = function (positions) {
            this.setAttribute('positions', positions);
        };

        _.prototype.setWidth = function (width) {
            this.setAttribute('width', width);
        };

        _.prototype.setGeodesic = function (geodesic) {
            this.setAttribute('geodesic', geodesic);
        };

        _.prototype.getPositions = function () {
            return this.getAttribute('positions');
        };

        _.prototype.getWidth = function () {
            return this.getAttribute('width');
        };

        _.prototype.getGeodesic = function (geodesic) {
            return this.getAttribute('geodesic');
        };

        _.prototype.getGeometry = function () {

            if (!Cesium.defined(this.positions) || this.positions.length < 2) {
                return;
            }

            return new Cesium.PolylineGeometry({
                positions: this.positions,
                height: this.height,
                width: this.width < 1 ? 1 : this.width,
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                ellipsoid: this.ellipsoid
            });
        }

        return _;
    })();
    var defaultBillboard = {
        iconUrl: "./img/dragIcon.png",
        shiftX: 0,
        shiftY: 0
    }

    var dragBillboard = {
        iconUrl: "./img/dragIcon2.png",
        shiftX: 0,
        shiftY: 0
    }

    var dragHalfBillboard = {
        iconUrl: "./img/dragIconLight.png",
        shiftX: 0,
        shiftY: 0
    }

    _.prototype.createBillboardGroup = function (points, options, callbacks) {
        var markers = new _.BillboardGroup(this, options);
        markers.addBillboards(points, callbacks);
        return markers;
    }

    _.BillboardGroup = function (drawHelper, options) {
        this._drawHelper = drawHelper;
        this._scene = drawHelper._scene;

        this._options = copyOptions(options, defaultBillboard);

        // create one common billboard collection for all billboards
        var b = new Cesium.BillboardCollection();
        this._scene.primitives.add(b);
        this._billboards = b;
        // keep an ordered list of billboards
        this._orderedBillboards = [];
    }

    _.BillboardGroup.prototype.createBillboard = function (position, callbacks) {

        var billboard = this._billboards.add({
            show: true,
            position: position,
            pixelOffset: new Cesium.Cartesian2(this._options.shiftX, this._options.shiftY),
            eyeOffset: new Cesium.Cartesian3(0.0, 0.0, 0.0),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            scale: 1.0,
            image: this._options.iconUrl,
            color: new Cesium.Color(1.0, 1.0, 1.0, 1.0)
        });
        currentBillboardToDestroy = billboard;
        BillboardList = this._billboards;
        writeCoordinatesOfMarkerToTextBox(position);
        // if editable
        if (callbacks) {
            var _self = this;
            var screenSpaceCameraController = this._scene.screenSpaceCameraController;
            function enableRotation(enable) {
                screenSpaceCameraController.enableRotate = enable;
            }
            function getIndex() {
                // find index
                for (var i = 0, I = _self._orderedBillboards.length; i < I && _self._orderedBillboards[i] != billboard; ++i);
                return i;
            }
            if (callbacks.dragHandlers) {
                var _self = this;
                setListener(billboard, 'leftDown', function (position) {
                    // TODO - start the drag handlers here
                    // create handlers for mouseOut and leftUp for the billboard and a mouseMove
                    function onDrag(position) {
                        billboard.position.x = position.x;
                        billboard.position.y = position.y;
                        billboard.position.z = position.z;
                        // find index
                        for (var i = 0, I = _self._orderedBillboards.length; i < I && _self._orderedBillboards[i] != billboard; ++i);
                        callbacks.dragHandlers.onDrag && callbacks.dragHandlers.onDrag(getIndex(), position);
                    }
                    function onDragEnd(position) {
                        //debugger
                        handler.destroy();
                        enableRotation(true);
                        callbacks.dragHandlers.onDragEnd && callbacks.dragHandlers.onDragEnd(getIndex(), position);
                        billboard._setActualPosition(position);
                        var bb = billboardArrayForUpdate.find(x => x == billboard);
                        if (bb == undefined) {
                            billboardArrayForUpdate.push(billboard);
                        }
                        if (_currentSurface.type.includes("area")) {
                            getUpdatedPositionForPoint(position, getIndex(), "polygon", "area-handling");
                        }
                        else if (_currentSurface.type == "route-to-remove") {
                            getUpdatedPositionForPoint(position, getIndex(), "route", "route-handling");
                        }
                    }

                    var handler = new Cesium.ScreenSpaceEventHandler(_self._scene.canvas);

                    handler.setInputAction(function (movement) {
                        var cartesian = _self._scene.camera.pickEllipsoid(movement.endPosition, ellipsoid);
                        if (cartesian) {
                            onDrag(cartesian);
                        } else {
                            //debugger
                            onDragEnd(cartesian);
                        }
                    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

                    handler.setInputAction(function (movement) {
                        //debugger
                        onDragEnd(_self._scene.camera.pickEllipsoid(movement.position, ellipsoid));

                    }, Cesium.ScreenSpaceEventType.LEFT_UP);

                    enableRotation(false);

                    callbacks.dragHandlers.onDragStart && callbacks.dragHandlers.onDragStart(getIndex(), _self._scene.camera.pickEllipsoid(position, ellipsoid));
                });
            }
            if (callbacks.onDoubleClick) {
                //debugger
                setListener(billboard, 'leftDoubleClick', function (position) {
                    callbacks.onDoubleClick(getIndex());
                });
            }
            if (callbacks.onClick) {
                setListener(billboard, 'leftClick', function (position) {
                    callbacks.onClick(getIndex());
                });
            }
            if (callbacks.tooltip) {
                setListener(billboard, 'mouseMove', function (position) {
                    _self._drawHelper._tooltip.showAt(position, callbacks.tooltip());
                });
                setListener(billboard, 'mouseOut', function (position) {
                    _self._drawHelper._tooltip.setVisible(false);
                });
            }
        }

        return billboard;
    }

    _.BillboardGroup.prototype.insertBillboard = function (index, position, callbacks) {
        this._orderedBillboards.splice(index, 0, this.createBillboard(position, callbacks));
    }

    _.BillboardGroup.prototype.addBillboard = function (position, callbacks) {
        this._orderedBillboards.push(this.createBillboard(position, callbacks));
    }

    _.BillboardGroup.prototype.addBillboards = function (positions, callbacks) {
        var index = 0;
        for (; index < positions.length; index++) {
            this.addBillboard(positions[index], callbacks);
        }
    }

    _.BillboardGroup.prototype.updateBillboardsPositions = function (positions) {
        var index = 0;
        for (; index < positions.length; index++) {
            this.getBillboard(index).position = positions[index];
        }
    }

    _.BillboardGroup.prototype.countBillboards = function () {
        return this._orderedBillboards.length;
    }

    _.BillboardGroup.prototype.getBillboard = function (index) {
        return this._orderedBillboards[index];
    }

    _.BillboardGroup.prototype.removeBillboard = function (index) {
        this._billboards.remove(this.getBillboard(index));
        this._orderedBillboards.splice(index, 1);
    }

    _.BillboardGroup.prototype.remove = function () {
        this._billboards = this._billboards && this._billboards.removeAll() && this._billboards.destroy();
    }

    _.BillboardGroup.prototype.setOnTop = function () {
        this._scene.primitives.raiseToTop(this._billboards);
    }

    _.prototype.startDrawingMarker = function (options) {

        var options = copyOptions(options, defaultBillboard);

        this.startDrawing(
            function () {
                if (markers != undefined && markers != null) {
                    markers.remove();
                }
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = scene.primitives;
        var tooltip = this._tooltip;

        var markers = new _.BillboardGroup(this, options);

        var mouseHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        mouseHandler.setInputAction(function (movement) {
            if (movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    markers.addBillboard(cartesian);
                    _self.stopDrawing();
                    options.callback(cartesian);
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        mouseHandler.setInputAction(function (movement) {
            var position = movement.endPosition;
            if (position != null) {
                var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                if (cartesian) {
                    tooltip.showAt(position, "<p>Click to add your marker. Position is: </p>" + getDisplayLatLngString(ellipsoid.cartesianToCartographic(cartesian)));
                } else {
                    tooltip.showAt(position, "<p>Click on the globe to add your marker.</p>");
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    }

    _.prototype.startDrawingPolygon = function (options) {
        var options = copyOptions(options, defaultSurfaceOptions);
        this.startDrawingPolyshape(true, options, false);
    }

    _.prototype.startDrawingPolyline = function (options) {
        var options = copyOptions(options, defaultPolylineOptions);
        this.startDrawingPolyshape(false, options, false);
    }

    _.prototype.startDrawingRuler = function (options) {
        var options = copyOptions(options, defaultRulerPolylineOptions);
        this.startDrawingPolyshape(false, options, true);
    }

    _.prototype.startDrawingPolyshape = function (isPolygon, options, isRuler) {

        this.startDrawing(
            function () {
                primitives.remove(poly);
                if (markers != undefined && markers != null) {
                    markers.remove();
                }
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = scene.primitives;
        var tooltip = this._tooltip;

        var minPoints = isPolygon ? 3 : 2;
        var poly;
        if (isPolygon) {
            poly = new DrawHelper.PolygonPrimitive(options);
        }
        else if (isPolygon == false && isRuler == false) {
            poly = new DrawHelper.PolylinePrimitive(options);
        }
        else if (isPolygon == false && isRuler == true) {
            poly = new DrawHelper.RulerPolylinePrimitive(options);
        }
        poly.asynchronous = false;
        primitives.add(poly);

        var positions = [];
        var markers = new _.BillboardGroup(this, defaultBillboard);

        var mouseHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        var rulerEdges = 0;
        mouseHandler.setInputAction(function (movement) {
            var permLabelPosition = new Cesium.Cartesian3();
            if (movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                viewer._enableInfoOrSelection = false;
                //pick = viewer.scene.pick(movement.position);
                //if (pick != undefined && pick.id.kml != undefined && pick.id.entityCollection.owner.name == undefined) {
                //    viewer._enableInfoOrSelection = true;
                //}
                if (cartesian) {
                    // first click
                    if (positions.length == 0) {
                        positions.push(cartesian.clone());
                        markers.addBillboard(positions[0]);
                    }
                    if (positions.length >= minPoints) {
                        permLabelPosition.x = (positions[positions.length - 1].x + positions[positions.length - 2].x) / 2;
                        permLabelPosition.y = (positions[positions.length - 1].y + positions[positions.length - 2].y) / 2;
                        permLabelPosition.z = (positions[positions.length - 1].z + positions[positions.length - 2].z) / 2;
                        poly.positions = positions;
                        poly._createPrimitive = true;
                    }
                    currPoly = poly;
                    // add new point to polygon
                    // this one will move with the mouse
                    positions.push(cartesian);
                    // add marker at the new position
                    let l = entities._entities.values[(entities._entities.values.length) - 1]
                    //let l = labels._labels[labels._labels.length - 1];
                    if (l != undefined && l.type == "RulerLabel") {
                        //debugger
                        //viewer.entities.removeById(l.id);
                        //entities.add(l);
                        //    l.show = true;
                    }
                    
                    markers.addBillboard(cartesian);
                    //labels.add(rulerLabel);
                }
            }
            rulerEdges++;
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        
        mouseHandler.setInputAction(function (movement) {
            setTimeout(function () {

                var position = movement.endPosition;
                var labelPosition = new Cesium.Cartesian3();
                if (position != null) {
                    if (positions.length == 0) {
                        //tooltip.showAt(position, "<p>Click to add first point</p>");
                    }
                    else {
                        var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                        if (cartesian) {
                            positions.pop();

                            // make sure it is slightly different
                            cartesian.y += (1 + Math.random());
                            positions.push(cartesian);
                            //if (positions.length == 1) {
                            //    labelPosition.x = positions[0].x / 2;
                            //    labelPosition.y = positions[0].y / 2;
                            //}
                            if (positions.length > 1) {
                                labelPosition.x = (positions[positions.length - 1].x + positions[positions.length - 2].x) / 2;
                                labelPosition.y = (positions[positions.length - 1].y + positions[positions.length - 2].y) / 2;
                                labelPosition.z = (positions[positions.length - 1].z + positions[positions.length - 2].z) / 2;
                            }
                            if (positions.length >= minPoints) {
                                poly.positions = positions;
                                poly._createPrimitive = true;
                            }
                            // update marker
                            if (markers.getBillboard(positions.length - 1).position) {
                                markers.getBillboard(positions.length - 1).position = cartesian;
                            }
                            // show tooltip
                            //tooltip.showAt(position, "<p>Click to add new point (" + positions.length + ")</p>" + (positions.length > minPoints ? "<p>Double click to finish drawing</p>" : ""));
                            //tooltip.showAt(labelPosition, "<p>BLALALALALA</p>");
                            //let l = labels._labels[labels._labels.length - 1];
                            let l = entities.getById(`${RulerCount}_Ruler_RulerLabel_${rulerEdges}`)
                            if (l) {
                                if (rulerEdges == l.rulerEdges) {
                                    viewer.entities.removeById(l.id);
                                }
                                else {
                                    //debugger
                                }
                                //labels.remove(l);
                            }
                            var startPoint;
                            var startPointDegrees;
                            var endPoint;
                            var endPointDegrees;
                            let azimuth = new Cesium.Cartesian3(); //https://www.omnicalculator.com/other/azimuth
                            let azimuthToShowOnLabel;
                            let distanceToCalc = new Cesium.Cartesian3();
                            let distanceToShowOnLabel;
                            var startPointLat;
                            var startPointLong;
                            var endPointLat; // 
                            var endPointLong;
                            var deltaLong;
                            var deltaLat;
                            if (positions.length > 1) {
                                startPoint = positions[positions.length - 2];
                                startPointDegrees = Cesium.Ellipsoid.WGS84.cartesianToCartographic(startPoint); //from cartesian to degrees
                                endPoint = positions[positions.length - 1];
                                endPointDegrees = Cesium.Ellipsoid.WGS84.cartesianToCartographic(endPoint); //from cartesian to degrees
                                startPointLat = Cesium.Math.toDegrees(startPointDegrees.latitude); // phi1
                                startPointLong = Cesium.Math.toDegrees(startPointDegrees.longitude); // lambda1
                                endPointLat = Cesium.Math.toDegrees(endPointDegrees.latitude); // phi2
                                endPointLong = Cesium.Math.toDegrees(endPointDegrees.longitude); // lambda2
                                distanceToCalc = Cesium.Cartesian3.distance(startPoint, endPoint);
                                distanceToShowOnLabel = distanceToCalc / 1000;
                                azimuthToShowOnLabel = calculateAzimuthBetweenCoordinates(startPointLat, startPointLong, endPointLat, endPointLong)
                                azimuthToShowOnLabel = roundingAzimuth(azimuthToShowOnLabel);
                                //deltaLong = endPointLong - startPointLong; // delta lambda
                                //deltaLat = endPointLat - startPointLat; // delta phi                            
                                //azimuth = azimuthCalc(deltaLong, endPointLat, startPointLat); //Math.atan2(Math.sin(deltaLong) * Math.cos(endPointLat), (Math.cos(startPointLat) * Math.sin(endPointLat)) - (Math.sin(startPointLat) * Math.cos(endPointLat) * Math.cos(deltaLong)));
                                //azimuthToShowOnLabel = azimuth * (180 / Math.PI);
                                //if (azimuthToShowOnLabel < 0) {
                                //    azimuthToShowOnLabel = azimuthToShowOnLabel + 360;
                                //}
                                //if (Math.ceil(azimuthToShowOnLabel) - azimuthToShowOnLabel <= azimuthToShowOnLabel - Math.floor(azimuthToShowOnLabel)) {
                                //    azimuthToShowOnLabel = Math.ceil(azimuthToShowOnLabel);
                                //}
                                //else {
                                //    azimuthToShowOnLabel = Math.floor(azimuthToShowOnLabel);
                                //}
                            }
                            var angle = Cesium.Math.toRadians(azimuthToShowOnLabel) - Cesium.Math.PI_OVER_TWO;
                            var pos = getLabelPositionForRuler(azimuthToShowOnLabel, labelPosition);
                            Cesium.Label.enableRightToLeftDetection = true;
                            var rulerLabel = viewer.entities.add({
                                show: true,
                                position: pos,
                                key: 'RulerLabel',
                                parentId: `${RulerCount}_Ruler`,
                                type: "RulerLabel",
                                rulerEdges: rulerEdges,
                                id: `${RulerCount}_Ruler_RulerLabel_${rulerEdges}`,
                                zIndex: 9999,
                                //clampToGround: true,
                                label: {
                                    text: `${distanceToShowOnLabel.toFixed(2) + " / " + azimuthToShowOnLabel}`,
                                    font: '600 20px sans-serif',
                                    fillColor: Cesium.Color.BLACK,
                                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                                    outlineColor: Cesium.Color.WHITE,
                                    outlineWidth: 5,
                                    pixelOffset: new Cesium.Cartesian2(0.0, -10.0),
                                    //eyeOffset: new Cesium.Cartesian3(0, 0, -100),
                                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                                    verticalOrigin: Cesium.VerticalOrigin.TOP,
                                    scale: 1.0,
                                    zIndex: 9999,
                                    rotation: azimuthToShowOnLabel,
                                }
                            });
                            //var rulerLabel = labels.add({
                            //    show: true,
                            //    position: labelPosition,
                            //    key: 'RulerLabel',
                            //    type: "RulerLabel",
                            //    parentId: `${RulerCount}_Ruler`,
                            //    id: `${RulerCount}_Ruler_RulerLabel_${rulerEdges}`,
                            //    text: `${distanceToShowOnLabel.toFixed(2) + " / " + azimuthToShowOnLabel}`,
                            //    font: '600 20px sans-serif',
                            //    fillColor: Cesium.Color.WHITE,
                            //    style: Cesium.LabelStyle.FILL,
                            //    pixelOffset: new Cesium.Cartesian2(0.0, 20.0),
                            //    //eyeOffset: new Cesium.Cartesian3(0, 0, -10),
                            //    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                            //    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                            //    scale: 1.0,
                            //    raise: true
                            //});
                            //orientation: new Cesium.VelocityOrientationProperty(poly)

                            //orientation: Cesium.Transforms.headingPitchRoll(
                            //    labelPosition,
                            //    new Cesium.HeadingPitchRoll(toRadians(azimuthToShowOnLabel), 0, 0)
                            //)
                            rulerEdgesToSave = rulerEdges;
                            //viewer.show(rulerLabel);
                            //rulerLabel.show = true;
                        }
                    }
                }
            }, 20);
            
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        mouseHandler.setInputAction(function (movement) {
            var position = movement.position;
            //var pick = viewer.scene.pick(movement.position);
            //setTimeout(function () {
            //    labels.remove(labels._labels[labels._labels.length - 2]);
            //    labels.remove(labels._labels[labels._labels.length - 1]);
            //}, 10);
            if (position != null) {
                if (positions.length < minPoints + 2) {
                    return;
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        _self.stopDrawing();
                        if (typeof options.callback == 'function') {
                            // remove overlapping ones
                            var index = positions.length - 1;
                            options.callback(positions);
                        }
                    }
                }
            }
            $("#draw-ruler").removeClass("sub-menu-item-active");
            $("#draw-ruler").children().removeClass("sub-menu-item-active");

        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    }

    function getExtentCorners(value) {
        return ellipsoid.cartographicArrayToCartesianArray([Cesium.Rectangle.northwest(value), Cesium.Rectangle.northeast(value), Cesium.Rectangle.southeast(value), Cesium.Rectangle.southwest(value)]);
    }

    _.prototype.startDrawingExtent = function (options) {

        var options = copyOptions(options, defaultSurfaceOptions);

        this.startDrawing(
            function () {
                if (extent != null) {
                    primitives.remove(extent);
                }
                if (markers != undefined && markers != null) {
                    markers.remove();
                }
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = this._scene.primitives;
        var tooltip = this._tooltip;

        var firstPoint = null;
        var extent = null;
        var markers = null;

        var mouseHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        function updateExtent(value) {
            if (extent == null) { extent = new DrawHelper.ExtentPrimitive({ extent: value, material: options.material, }); extent.asynchronous = false; primitives.add(extent); } extent.setExtent(value);
            extent.rectangle = value;
            // update the markers
            var corners = getExtentCorners(value);
            // create if they do not yet exist
            if (markers == null) {
                markers = new _.BillboardGroup(_self, defaultBillboard);
                markers.addBillboards(corners);
            } else {
                markers.updateBillboardsPositions(corners);
            }
        }

        // Now wait for start
        mouseHandler.setInputAction(function (movement) {
            if (movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    if (extent == null) {
                        // create the rectangle
                        firstPoint = ellipsoid.cartesianToCartographic(cartesian);
                        var value = getExtent(firstPoint, firstPoint);
                        updateExtent(value);
                    } else {
                        _self.stopDrawing();
                        if (typeof options.callback == 'function') {
                            options.callback(getExtent(firstPoint, ellipsoid.cartesianToCartographic(cartesian)));
                        }
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        mouseHandler.setInputAction(function (movement) {
            var position = movement.endPosition;
            if (position != null) {
                if (extent == null) {
                    tooltip.showAt(position, "<p>Click to start drawing rectangle</p>");
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        var value = getExtent(firstPoint, ellipsoid.cartesianToCartographic(cartesian));
                        updateExtent(value);
                        tooltip.showAt(position, "<p>Drag to change rectangle extent</p><p>Click again to finish drawing</p>");
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    }

    _.prototype.startDrawingCircle = function (options) {

        var options = copyOptions(options, defaultSurfaceOptions);

        this.startDrawing(
            function cleanUp() {
                if (circle != null) {
                    primitives.remove(circle);
                }
                if (markers != undefined && markers != null) {
                    markers.remove();
                }
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = this._scene.primitives;
        var tooltip = this._tooltip;

        var circle = null;
        var markers = null;

        var mouseHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        mouseHandler.setInputAction(function (movement) {
            if (movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    if (circle == null) {
                        // create the circle
                        circle = new _.CirclePrimitive({
                            center: cartesian,
                            radius: 0,
                            asynchronous: false,
                            material: options.material
                        });
                        primitives.add(circle);
                        markers = new _.BillboardGroup(_self, defaultBillboard);
                        markers.addBillboards([cartesian]);
                    } else {
                        if (typeof options.callback == 'function') {
                            options.callback(circle.getCenter(), circle.getRadius());
                        }
                        _self.stopDrawing();
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        mouseHandler.setInputAction(function (movement) {
            var position = movement.endPosition;
            if (position != null) {
                if (circle == null) {
                    tooltip.showAt(position, "<p>Click to start drawing the circle</p>");
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        circle.setRadius(Cesium.Cartesian3.distance(circle.getCenter(), cartesian));
                        markers.updateBillboardsPositions(cartesian);
                        tooltip.showAt(position, "<p>Move mouse to change circle radius</p><p>Click again to finish drawing</p>");
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    }
    _.prototype.startDrawingEllipse = function (options) {

        var options = copyOptions(options, defaultSurfaceOptions);

        this.startDrawing(
            function cleanUp() {
                if (ellipse != null) {
                    primitives.remove(ellipse);
                }
                if (markers != undefined && markers != null) {
                    markers.remove();
                }
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = this._scene.primitives;
        var tooltip = this._tooltip;

        var ellipse = null;
        var markers = null;

        var mouseHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        mouseHandler.setInputAction(function (movement) {
            if (movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    if (ellipse == null) {
                        // create the circle
                        ellipse = new _.EllipsePrimitive({
                            center: cartesian,
                            semiMajorAxis: 0,
                            semiMinorAxis: 0,
                            rotation: 0,
                            asynchronous: false,
                            material: options.material,
                        });
                        primitives.add(ellipse);
                        markers = new _.BillboardGroup(_self, defaultBillboard);
                        markers.addBillboards([cartesian]);
                    } else {
                        if (typeof options.callback == 'function') {
                            options.callback(ellipse.getCenter(), ellipse.getSemiMajorAxis(), ellipse.getSemiMinorAxis(), ellipse.getRotation());
                        }
                        _self.stopDrawing();
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        mouseHandler.setInputAction(function (movement) {
            var position = movement.endPosition;
            if (position != null) {
                if (ellipse == null) {
                    tooltip.showAt(position, "<p>Click to start drawing the circle</p>");
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        var xy = new Cesium.Cartesian2();
                        xy.x = movement.startPosition.x - movement.endPosition.x;
                        xy.y = movement.startPosition.y - movement.endPosition.y;
                        var rotation = Math.atan2(xy.x, xy.y);
                        var strokeWidth = 15;
                        var outlinewidth = 30;
                        ellipse.setRotation(rotation);
                        ellipse.setSemiMajorAxis(Cesium.Cartesian3.distance(ellipse.getCenter(), cartesian));
                        ellipse.setSemiMinorAxis(Cesium.Cartesian3.distance(ellipse.getCenter(), cartesian) / 2);
                        ellipse.setStrokeWidth(strokeWidth);
                        ellipse.setOutlineWidth(outerWidth);
                        markers.updateBillboardsPositions(cartesian);
                        tooltip.showAt(position, "<p>Move mouse to change circle radius</p><p>Click again to finish drawing</p>");
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    }
    _.prototype.enhancePrimitives = function () {

        var drawHelper = this;

        Cesium.Billboard.prototype.setEditable = function () {
            if (this._editable) {
                return;
            }

            this._editable = true;

            var billboard = this;

            var _self = this;

            function enableRotation(enable) {
                drawHelper._scene.screenSpaceCameraController.enableRotate = enable;
            }

            setListener(billboard, 'leftDown', function (position) {
                _self._editable = true;
                // TODO - start the drag handlers here
                // create handlers for mouseOut and leftUp for the billboard and a mouseMove
                function onDrag(position) {
                    billboard.position = position;
                    _self.executeListeners({ name: 'drag', positions: position });
                }
                function onDragEnd(position) {
                    //debugger
                    handler.destroy();
                    enableRotation(false);
                    _self._editable = false;
                    _self.position = position;
                    writeCoordinatesOfMarkerToTextBox(_self.position);
                    //_self.executeListeners({name: 'dragEnd', positions: position});
                }

                var handler = new Cesium.ScreenSpaceEventHandler(drawHelper._scene.canvas);

                handler.setInputAction(function (movement) {
                    var cartesian = drawHelper._scene.camera.pickEllipsoid(movement.endPosition, ellipsoid);
                    if (cartesian && _self._editable) {
                        onDrag(cartesian);
                    } else {
                        //debugger
                        onDragEnd(cartesian);
                    }
                }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

                handler.setInputAction(function (movement) {
                    //debugger
                    onDragEnd(drawHelper._scene.camera.pickEllipsoid(movement.position, ellipsoid));
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                enableRotation(false);

            });

            enhanceWithListeners(billboard);

        }

        function setHighlighted(highlighted) {

            var scene = drawHelper._scene;

            // if no change
            // if already highlighted, the outline polygon will be available
            if (this._highlighted && this._highlighted == highlighted) {
                return;
            }
            // disable if already in edit mode
            if (this._editMode === true) {
                return;
            }
            this._highlighted = highlighted;
            // highlight by creating an outline polygon matching the polygon points
            //if (highlighted) {
            //    // make sure all other shapes are not highlighted
            //    drawHelper.setHighlighted(this);
            //    this._strokeColor = this.strokeColor;
            //    this.setStrokeStyle(Cesium.Color.fromCssColorString('white'), this.strokeWidth);
            //} else {
            //    if(this._strokeColor) {
            //        this.setStrokeStyle(this._strokeColor, this.strokeWidth);
            //    } else {
            //        this.setStrokeStyle(undefined, undefined);
            //    }
            //}
        }

        function setEditMode(editMode) {
            // if no change
            if (this._editMode == editMode) {
                return;
            }
            // make sure all other shapes are not in edit mode before starting the editing of this shape
            drawHelper.disableAllHighlights();
            // display markers
            if (_currentSurface != undefined && _currentSurface.material.type.includes("Ruler")) {
                editMode = false;
            }
            if (editMode) {
                drawHelper.setEdited(this);
                var scene = drawHelper._scene;
                var _self = this;
                // create the markers and handlers for the editing
                if (this._markers == null) {
                    var markers = new _.BillboardGroup(drawHelper, dragBillboard);
                    var editMarkers = new _.BillboardGroup(drawHelper, dragHalfBillboard);
                    // function for updating the edit markers around a certain point
                    function updateHalfMarkers(index, positions) {
                        // update the half markers before and after the index
                        var editIndex = index - 1 < 0 ? positions.length - 1 : index - 1;
                        if (editIndex < editMarkers.countBillboards()) {
                            editMarkers.getBillboard(editIndex).position = calculateHalfMarkerPosition(editIndex);
                        }
                        editIndex = index;
                        if (editIndex < editMarkers.countBillboards()) {
                            editMarkers.getBillboard(editIndex).position = calculateHalfMarkerPosition(editIndex);
                        }
                    }
                    function onEdited() {
                        _self.executeListeners({ name: 'onEdited', positions: _self.positions });
                    }
                    var handleMarkerChanges = {
                        dragHandlers: {
                            onDrag: function (index, position) {
                                _self.positions[index] = position;
                                updateHalfMarkers(index, _self.positions);
                                _self._createPrimitive = true;
                            },
                            onDragEnd: function (index, position) {
                                //debugger
                                _self._createPrimitive = true;
                                onEdited();
                            }
                        },
                        //onDoubleClick: function (index) {
                        //    if (_self.positions.length < 4) {
                        //        return;
                        //    }
                        //    // remove the point and the corresponding markers
                        //    _self.positions.splice(index, 1);
                        //    _self._createPrimitive = true;
                        //    markers.removeBillboard(index);
                        //    editMarkers.removeBillboard(index);
                        //    updateHalfMarkers(index, _self.positions);
                        //    onEdited();
                        //},
                        //tooltip: function () {
                        //    if (_self.positions.length > 3) {
                        //        return "Double click to remove this point";
                        //    }
                        //}
                    };
                    // add billboards and keep an ordered list of them for the polygon edges
                    markers.addBillboards(_self.positions, handleMarkerChanges);
                    this._markers = markers;
                    function calculateHalfMarkerPosition(index) {
                        var positions = _self.positions;
                        //return positions;
                        //return ellipsoid.cartographicToCartesian(
                        //    new Cesium.EllipsoidGeodesic(ellipsoid.cartesianToCartographic(positions[index]),
                        //        ellipsoid.cartesianToCartographic(positions[index < positions.length - 1 ? index + 1 : 0])).
                        //        interpolateUsingFraction(0.5)
                        //);
                        return ellipsoid.cartographicToCartesian(
                            new Cesium.EllipsoidGeodesic(ellipsoid.cartesianToCartographic(positions[index]),
                                ellipsoid.cartesianToCartographic(positions[index])).
                                interpolateUsingFraction(0.5)
                        );
                    }
                    var halfPositions = [];
                    var index = 0;
                    var length = _self.positions.length + (this.isPolygon ? 0 : -1);
                    if (this.type == 'route-to-remove') {
                        let qq = entities._entities.values.filter(x => x.name != undefined && x.name.includes("Route_point") && x.id.includes(selectedEntityForUpdateOrDelete));;
                        if (qq) {
                            for (let i = 0; i < qq.length; i++) {
                                qq[i].show = false;
                            }
                        }
                    }
                    for (; index < length; index++) {
                        //debugger
                        //halfPositions.push(_self.positions[index]);
                        //halfPositions.push(calculateHalfMarkerPosition(index));
                    }
                    var handleEditMarkerChanges = {
                        dragHandlers: {
                            onDragStart: function (index, position) {
                                // add a new position to the polygon but not a new marker yet
                                this.index = index + 1;
                                _self.positions.splice(this.index, 0, position);
                                _self._createPrimitive = true;
                            },
                            onDrag: function (index, position) {
                                _self.positions[this.index] = position;
                                _self._createPrimitive = true;
                            },
                            onDragEnd: function (index, position) {
                                //debugger
                                // create new sets of makers for editing
                                markers.insertBillboard(this.index, position, handleMarkerChanges);
                                editMarkers.getBillboard(this.index - 1).position = calculateHalfMarkerPosition(this.index - 1);
                                editMarkers.insertBillboard(this.index, calculateHalfMarkerPosition(this.index), handleEditMarkerChanges);
                                _self._createPrimitive = true;
                                onEdited();
                            }
                        },
                        tooltip: function () {
                            return "Drag to create a new point";
                        }
                    };
                    editMarkers.addBillboards(halfPositions, handleEditMarkerChanges);
                    this._editMarkers = editMarkers;
                    // add a handler for clicking in the globe
                    this._globeClickhandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
                    this._globeClickhandler.setInputAction(
                        function (movement) {
                            var pickedObject = scene.pick(movement.position);
                            if (!(pickedObject && pickedObject.primitive)) {
                                endEditMode(_self);
                            }
                        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                    // set on top of the polygon
                    markers.setOnTop();
                    editMarkers.setOnTop();
                }
                this._editMode = true;
            } else {
                if (this._markers != null) {
                    this._markers.remove();
                    this._editMarkers.remove();
                    this._markers = null;
                    this._editMarkers = null;
                    this._globeClickhandler.destroy();
                }
                this._editMode = false;
            }

        }

        DrawHelper.PolylinePrimitive.prototype.setEditable = function () {
            if (this.setEditMode) {
                return;
            }

            var polyline = this;
            polyline.isPolygon = false;
            polyline.isRuler = false;
            polyline.asynchronous = false;

            drawHelper.registerEditableShape(polyline);

            polyline.setEditMode = setEditMode;

            var originalWidth = this.width;

            //polyline.setHighlighted = function(highlighted) {
            //    // disable if already in edit mode
            //    if(this._editMode === true) {
            //        return;
            //    }
            //    if(highlighted) {
            //        drawHelper.setHighlighted(this);
            //        this.setWidth(originalWidth * 2);
            //    } else {
            //        this.setWidth(originalWidth);
            //    }
            //}

            polyline.getExtent = function () {
                return Cesium.Extent.fromCartographicArray(ellipsoid.cartesianArrayToCartographicArray(this.positions));
            }

            enhanceWithListeners(polyline);

            polyline.setEditMode(false);

        }
        DrawHelper.RulerPolylinePrimitive.prototype.setEditable = function () {
            return;
            if (this.setEditMode) {
                return;
            }

            var polyline = this;
            polyline.isPolygon = false;
            polyline.isRuler = true;
            polyline.asynchronous = false;

            drawHelper.registerEditableShape(polyline);

            polyline.setEditMode = setEditMode;

            var originalWidth = this.width;

            //polyline.setHighlighted = function(highlighted) {
            //    // disable if already in edit mode
            //    if(this._editMode === true) {
            //        return;
            //    }
            //    if(highlighted) {
            //        drawHelper.setHighlighted(this);
            //        this.setWidth(originalWidth * 2);
            //    } else {
            //        this.setWidth(originalWidth);
            //    }
            //}

            polyline.getExtent = function () {
                return Cesium.Extent.fromCartographicArray(ellipsoid.cartesianArrayToCartographicArray(this.positions));
            }

            enhanceWithListeners(polyline);

            polyline.setEditMode(false);

        }

        DrawHelper.PolygonPrimitive.prototype.setEditable = function () {

            var polygon = this;
            polygon.asynchronous = false;

            var scene = drawHelper._scene;

            drawHelper.registerEditableShape(polygon);

            polygon.setEditMode = setEditMode;

            polygon.setHighlighted = setHighlighted;

            enhanceWithListeners(polygon);

            polygon.setEditMode(false);

        }

        DrawHelper.ExtentPrimitive.prototype.setEditable = function () {

            if (this.setEditMode) {
                return;
            }

            var extent = this;
            var scene = drawHelper._scene;

            drawHelper.registerEditableShape(extent);
            extent.asynchronous = false;

            extent.setEditMode = function (editMode) {
                // if no change
                if (this._editMode == editMode) {
                    return;
                }
                drawHelper.disableAllHighlights();
                // display markers
                if (editMode) {
                    // make sure all other shapes are not in edit mode before starting the editing of this shape
                    drawHelper.setEdited(this);
                    // create the markers and handlers for the editing
                    if (this._markers == null) {
                        var markers = new _.BillboardGroup(drawHelper, dragBillboard);
                        function onEdited() {
                            extent.executeListeners({ name: 'onEdited', extent: extent.extent });
                        }
                        var handleMarkerChanges = {
                            dragHandlers: {
                                onDrag: function (index, position) {
                                    var corner = markers.getBillboard((index + 2) % 4).position;
                                    extent.setExtent(getExtent(ellipsoid.cartesianToCartographic(corner), ellipsoid.cartesianToCartographic(position)));
                                    markers.updateBillboardsPositions(getExtentCorners(extent.extent));
                                },
                                onDragEnd: function (index, position) {
                                    //debugger
                                    onEdited();
                                }
                            },
                            tooltip: function () {
                                return "Drag to change the corners of this extent";
                            }
                        };
                        markers.addBillboards(getExtentCorners(extent.extent), handleMarkerChanges);
                        this._markers = markers;
                        // add a handler for clicking in the globe
                        this._globeClickhandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
                        this._globeClickhandler.setInputAction(
                            function (movement) {
                                var pickedObject = scene.pick(movement.position);
                                // disable edit if pickedobject is different or not an object
                                try {
                                    if (!(pickedObject && !pickedObject.isDestroyed() && pickedObject.primitive)) {
                                        extent.setEditMode(false);
                                    }
                                } catch (e) {
                                    extent.setEditMode(false);
                                }
                            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                        // set on top of the polygon
                        markers.setOnTop();
                    }
                    this._editMode = true;
                } else {
                    if (this._markers != null) {
                        this._markers.remove();
                        this._markers = null;
                        this._globeClickhandler.destroy();
                    }
                    this._editMode = false;
                }
            }

            extent.setHighlighted = setHighlighted;

            enhanceWithListeners(extent);

            extent.setEditMode(false);

        }
        _.EllipsePrimitive.prototype.getEllipseCartesianCoordinates = function (granularity) {
            //ellipse.getCenter(), ellipse.getSemiMajorAxis(), ellipse.getSemiMinorAxis(), ellipsoid, ellipse.getRotation() + Math.PI / 2, Math.PI / 2.0)
            var geometry = Cesium.EllipseOutlineGeometry.createGeometry(new Cesium.EllipseOutlineGeometry({ center: this.center, semiMajorAxis: this.semiMajorAxis, semiMinorAxis: this.semiMinorAxis, ellipsoid: ellipsoid, rotation: this.rotation, granularity: granularity }));
            var count = 0, value, values = [];
            for (; count < geometry.attributes.position.values.length; count += 3) {
                value = geometry.attributes.position.values;
                values.push(new Cesium.Cartesian3(value[count], value[count + 1], value[count + 2]));
            }
            return values;
        };
        _.EllipsePrimitive.prototype.setEditable = function () {

            if (this.setEditMode) {
                return;
            }

            var ellipse = this;
            var scene = drawHelper._scene;

            ellipse.asynchronous = false;

            drawHelper.registerEditableShape(ellipse);

            ellipse.setEditMode = function (editMode) {
                // if no change
                if (this._editMode == editMode) {
                    return;
                }
                drawHelper.disableAllHighlights();
                // display markers
                if (editMode) {
                    // make sure all other shapes are not in edit mode before starting the editing of this shape
                    drawHelper.setEdited(this);
                    var _self = this;
                    // create the markers and handlers for the editing
                    if (this._markers == null) {
                        var markers = new _.BillboardGroup(drawHelper, dragBillboard);
                        function getMarkerPositions() {
                            return _self.getEllipseCartesianCoordinates(Cesium.Math.PI_OVER_TWO);
                            //return Cesium.EllipseOutlineGeometry(ellipse.getCenter(), ellipse.getSemiMajorAxis(), ellipse.getSemiMinorAxis(), ellipsoid, ellipse.getRotation() + Math.PI / 2, Math.PI / 2.0);
                        }
                        function onEdited() {
                            ellipse.executeListeners({ name: 'onEdited', center: ellipse.getCenter(), semiMajorAxis: ellipse.getSemiMajorAxis(), semiMinorAxis: ellipse.getSemiMinorAxis(), rotation: ellipse.getRotation() });
                        }
                        var handleMarkerChanges = {
                            dragHandlers: {
                                onDrag: function (index, position) {
                                    var distance = Cesium.Cartesian3.distance(ellipse.getCenter(), position);
                                    if (index % 2 == 0) {
                                        ellipse.setSemiMinorAxis(distance);
                                    } else {
                                        ellipse.setSemiMajorAxis(distance);
                                    }
                                    markers.updateBillboardsPositions(getMarkerPositions());
                                },
                                onDragEnd: function (index, position) {
                                    //debugger
                                    onEdited();
                                }
                            },
                            tooltip: function () {
                                return "Drag to change the excentricity and radius";
                            }
                        };
                        markers.addBillboards(getMarkerPositions(), handleMarkerChanges);
                        this._markers = markers;
                        // add a handler for clicking in the globe
                        this._globeClickhandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
                        this._globeClickhandler.setInputAction(
                            function (movement) {
                                var pickedObject = scene.pick(movement.position);
                                if (!(pickedObject && pickedObject.primitive)) {
                                    endEditMode(_self);
                                }
                            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                        // set on top of the polygon
                        markers.setOnTop();
                    }
                    this._editMode = true;
                } else {
                    if (this._markers != null) {
                        this._markers.remove();
                        this._markers = null;
                        this._globeClickhandler.destroy();
                    }
                    this._editMode = false;
                }
            }

            ellipse.setHighlighted = setHighlighted;

            enhanceWithListeners(ellipse);

            ellipse.setEditMode(false);
        }

        _.CirclePrimitive.prototype.getCircleCartesianCoordinates = function (granularity) {
            var geometry = Cesium.CircleOutlineGeometry.createGeometry(new Cesium.CircleOutlineGeometry({ ellipsoid: ellipsoid, center: this.getCenter(), radius: this.getRadius(), granularity: granularity }));
            var count = 0, value, values = [];
            for (; count < geometry.attributes.position.values.length; count += 3) {
                value = geometry.attributes.position.values;
                values.push(new Cesium.Cartesian3(value[count], value[count + 1], value[count + 2]));
            }
            return values;
        };

        _.CirclePrimitive.prototype.setEditable = function () {

            if (this.setEditMode) {
                return;
            }

            var circle = this;
            var scene = drawHelper._scene;

            circle.asynchronous = false;

            drawHelper.registerEditableShape(circle);

            circle.setEditMode = function (editMode) {
                // if no change
                if (this._editMode == editMode) {
                    return;
                }
                drawHelper.disableAllHighlights();
                // display markers
                if (editMode) {
                    // make sure all other shapes are not in edit mode before starting the editing of this shape
                    drawHelper.setEdited(this);
                    var _self = this;
                    // create the markers and handlers for the editing
                    if (this._markers == null) {
                        var markers = new _.BillboardGroup(drawHelper, dragBillboard);
                        function getMarkerPositions() {
                            return _self.getCircleCartesianCoordinates(Cesium.Math.PI_OVER_TWO);
                        }
                        function onEdited() {
                            circle.executeListeners({ name: 'onEdited', center: circle.getCenter(), radius: circle.getRadius() });
                        }
                        var handleMarkerChanges = {
                            dragHandlers: {
                                onDrag: function (index, position) {
                                    circle.setRadius(Cesium.Cartesian3.distance(circle.getCenter(), position));
                                    markers.updateBillboardsPositions(getMarkerPositions());
                                },
                                onDragEnd: function (index, position) {
                                    //debugger
                                    onEdited();
                                }
                            },
                            tooltip: function () {
                                return "Drag to change the radius";
                            }
                        };
                        markers.addBillboards(getMarkerPositions(), handleMarkerChanges);
                        this._markers = markers;
                        // add a handler for clicking in the globe
                        this._globeClickhandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
                        this._globeClickhandler.setInputAction(
                            function (movement) {
                                var pickedObject = scene.pick(movement.position);
                                if (!(pickedObject && pickedObject.primitive)) {
                                    endEditMode(_self);
                                }
                            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                        // set on top of the polygon
                        markers.setOnTop();
                    }
                    this._editMode = true;
                } else {
                    if (this._markers != null) {
                        this._markers.remove();
                        this._markers = null;
                        this._globeClickhandler.destroy();
                    }
                    this._editMode = false;
                }
            }

            circle.setHighlighted = setHighlighted;

            enhanceWithListeners(circle);

            circle.setEditMode(false);
        }

    }

    _.DrawHelperWidget = (function () {
        // constructor
        function _(drawHelper, options) {
            // container must be specified
            if (!(Cesium.defined(options.container))) {
                throw new Cesium.DeveloperError('Container is required');
            }

            var drawOptions = {
                none: "",
                markerIcon: "./img/glyphicons_242_google_maps.png",
                polylineIcon: "./img/route.png",
                polygonIcon: "./img/glyphicons_096_vector_path_polygon.png",
                circleIcon: "./img/glyphicons_095_vector_path_circle.png",
                extentIcon: "./img/glyphicons_094_vector_path_square.png",
                clearIcon: "./img/glyphicons_067_cleaning.png",
                ellipseIcon: "./img/glyphicons_098_vector_path_ellipse.png",
                rulerIcon: "./img/ruler.png",
                polylineDrawingOptions: defaultPolylineOptions,
                polygonDrawingOptions: defaultPolygonOptions,
                extentDrawingOptions: defaultExtentOptions,
                circleDrawingOptions: defaultCircleOptions,
                rulerDrawingOptions: defaultRulerPolylineOptions
            };

            fillOptions(options, drawOptions);

            var _self = this;

            var toolbar = document.createElement('DIV');
            toolbar.className = "toolbar";
            options.container.appendChild(toolbar);

            function addIcon(id, url, title, callback) {
                var div = document.createElement('DIV');
                div.className = `button ${id}`;
                div.title = title;
                toolbar.appendChild(div);
                div.onclick = callback;
                var span = document.createElement('SPAN');
                div.appendChild(span);
                var image = document.createElement('IMG');
                image.src = url;
                span.appendChild(image);
                return div;
            }

            var scene = drawHelper._scene;
            if (options.buttons.includes('marker')) {
                addIcon('marker', options.markerIcon, 'Click to start drawing a 2D marker', function () {
                    //$('marker').attr('disabled', 'disabled');

                    //for (var i = 0; i < buttonTodisable.length; i++) {
                    //    buttonTodisable[i].disabled = true;
                    //}
                    drawHelper.startDrawingMarker({
                        callback: function (position) {
                            _self.executeListeners({ name: 'markerCreated', position: position });
                        }
                    });
                    //let buttonTodisable = document.querySelectorAll('.button,.marker');
                    //buttonTodisable.disabled = true;
                })
            }
            if (options.buttons.includes('polyline')) {
                addIcon('polyline', options.polylineIcon, 'Ciao', function () {
                    drawHelper.startDrawingPolyline({
                        callback: function (positions) {
                            _self.executeListeners({ name: 'polylineCreated', positions: positions });
                        }
                    });
                })
            }
            if (options.buttons.includes('ruler')) {
                addIcon('ruler', options.rulerIcon, '', function () {
                    drawHelper.startDrawingRuler({
                        callback: function (positions) {
                            _self.executeListeners({ name: 'rulerCreated', positions: positions });
                        }
                    });
                })
            }

            if (options.buttons.includes('polygon')) {
                addIcon('polygon', options.polygonIcon, 'Click to start drawing a 2D polygon', function () {
                    drawHelper.startDrawingPolygon({
                        callback: function (positions) {
                            _self.executeListeners({ name: 'polygonCreated', positions: positions });
                        }
                    });
                })
            }

            if (options.buttons.includes('extent')) {
                addIcon('extent', options.extentIcon, 'Click to start drawing an Extent', function () {
                    drawHelper.startDrawingExtent({
                        callback: function (extent) {
                            _self.executeListeners({ name: 'extentCreated', extent: extent });
                        }
                    });
                })
            }

            if (options.buttons.includes('circle')) {
                addIcon('circle', options.circleIcon, 'Click to start drawing a Circle', function () {
                    drawHelper.startDrawingCircle({
                        callback: function (center, radius) {
                            _self.executeListeners({ name: 'circleCreated', center: center, radius: radius });
                        }
                    });
                })
            }
            if (options.buttons.includes('ellipse')) {
                addIcon('ellipse', options.ellipseIcon, 'Click to start drawing a Ellipse', function () {
                    drawHelper.startDrawingEllipse({
                        callback: function (center, semiMajorAxis, semiMinorAxis, rotation) {
                            _self.executeListeners({ name: 'ellipseCreated', center: center, semiMajorAxis: semiMajorAxis, semiMinorAxis: semiMinorAxis, rotation: rotation });
                        }
                    });
                })
            }


            // add a clear button at the end
            // add a divider first
            var div = document.createElement('DIV');
            div.className = 'divider';
            toolbar.appendChild(div);
            addIcon('clear', options.clearIcon, 'Remove all primitives', function () {
                scene.primitives.removeAll();
            });

            enhanceWithListeners(this);

        }

        return _;

    })();

    _.prototype.addToolbar = function (container, options, innerContainerOptional) {
        options = copyOptions(options, { container: container });
        if (innerContainerOptional != undefined) {
            options.container = document.getElementById(innerContainerOptional);
        }
        return new _.DrawHelperWidget(this, options);
    }

    function getExtent(mn, mx) {
        var e = new Cesium.Rectangle();

        // Re-order so west < east and south < north
        e.west = Math.min(mn.longitude, mx.longitude);
        e.east = Math.max(mn.longitude, mx.longitude);
        e.south = Math.min(mn.latitude, mx.latitude);
        e.north = Math.max(mn.latitude, mx.latitude);

        // Check for approx equal (shouldn't require abs due to re-order)
        var epsilon = Cesium.Math.EPSILON7;

        if ((e.east - e.west) < epsilon) {
            e.east += epsilon * 2.0;
        }

        if ((e.north - e.south) < epsilon) {
            e.north += epsilon * 2.0;
        }

        return e;
    };

    function createTooltip(frameDiv) {

        var tooltip = function (frameDiv) {

            var div = document.createElement('DIV');
            div.className = "twipsy right";

            var arrow = document.createElement('DIV');
            arrow.className = "twipsy-arrow";
            div.appendChild(arrow);

            var title = document.createElement('DIV');
            title.className = "twipsy-inner";
            div.appendChild(title);

            this._div = div;
            this._title = title;

            // add to frame div and display coordinates
            frameDiv.appendChild(div);
        }

        tooltip.prototype.setVisible = function (visible) {
            this._div.style.display = visible ? 'block' : 'none';
        }

        tooltip.prototype.showAt = function (position, message) {
            if (position && message) {
                this.setVisible(true);
                this._title.innerHTML = message;
                this._div.style.left = position.x + 10 + "px";
                this._div.style.top = (position.y - this._div.clientHeight / 2) + "px";
            }
        }

        return new tooltip(frameDiv);
    }

    function getDisplayLatLngString(cartographic, precision) {
        return cartographic.longitude.toFixed(precision || 3) + ", " + cartographic.latitude.toFixed(precision || 3);
    }

    function clone(from, to) {
        if (from == null || typeof from != "object") return from;
        if (from.constructor != Object && from.constructor != Array) return from;
        if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
            from.constructor == String || from.constructor == Number || from.constructor == Boolean)
            return new from.constructor(from);

        to = to || new from.constructor();

        for (var name in from) {
            to[name] = typeof to[name] == "undefined" ? clone(from[name], null) : to[name];
        }

        return to;
    }

    function fillOptions(options, defaultOptions) {
        options = options || {};
        var option;
        for (option in defaultOptions) {
            if (options[option] === undefined) {
                options[option] = clone(defaultOptions[option]);
            }
        }
    }

    // shallow copy
    function copyOptions(options, defaultOptions) {
        var newOptions = clone(options), option;
        for (option in defaultOptions) {
            if (newOptions[option] === undefined) {
                newOptions[option] = clone(defaultOptions[option]);
            }
        }
        return newOptions;
    }

    function setListener(primitive, type, callback) {
        primitive[type] = callback;
    }

    function enhanceWithListeners(element) {

        element._listeners = {};

        element.addListener = function (name, callback) {
            this._listeners[name] = (this._listeners[name] || []);
            this._listeners[name].push(callback);
            return this._listeners[name].length;
        }

        element.executeListeners = function (event, defaultCallback) {
            if (this._listeners[event.name] && this._listeners[event.name].length > 0) {
                var index = 0;
                for (; index < this._listeners[event.name].length; index++) {
                    this._listeners[event.name][index](event);
                }
            } else {
                if (defaultCallback) {
                    defaultCallback(event);
                }
            }
        }

    }

    return _;
})();
var editStartPosition;

function endEditMode(self) {
    _currentSurface = undefined;
    if (self != undefined) {
        self.setEditMode(false);
    }
    for (var i = 0; i < BillboardList._billboards.length; i++) {
        BillboardList._billboards[i]._destroy();
    }
    billboardArrayForUpdate = [];
    isEditMode = false;
}

function startEditMode(surface) {
    if (_currentSurface != undefined && _currentSurface != surface) {
        return;
    }
    if (_currentSurface == surface) {
        surface.setEditMode(true);
        return;
    }
    editStartPosition = Cesium.clone(surface);
    if (editStartPosition.type == "polygon" || editStartPosition.type == "area-to-remove"/* || editStartPosition.type == "route-to-remove"*/) {
        editStartPosition.positions = new Array()
        for (let i = 0; i < surface.positions.length; i++) {
            editStartPosition.positions.push(surface.positions[i]);
        }
    }
    _currentSurface = surface;
    //should make copy of area data for canceling edit
    surface.setEditMode(true);
    isEditMode = true;
    //openEditWindowForPrimitive(surface);
}

function resetCurrentSurfaceData() {
    _currentSurface.setEditMode(false);
    _currentSurface = undefined;
}

function openEditWindowForPrimitive(surface) {
    isEditMode = true;
    areaDataToSend = [];
    areaType = "";
    $.ajax({
        type: "GET",
        url: `../Shared/UpdateArea`,
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        async: false,
        success: function (result) {
            const qqq = $("#UpdateArea");
            tempForm = qqq;
            qqq.html(result);
            tempForm.parent().css("width", "30%");
            tempForm.parent().css("height", "fit-content");
            tempForm.parent().css("max-height", "50%");
            tempForm.parent().css("top", "300px");
            tempForm.parent().css("left", "0%");
            tempForm.parent().addClass("impo");
            qqq.data("kendoWindow").open();
            //handleNewTestPlanner();

            runTestPlanKendoDialog = qqq.data("kendoWindow");
        },
        failure: function (response) {
        },
        error: function (e) {
        }
    });
}

//function deleteRuler(pick) {
//    if (pick != undefined && pick != null) {
//        if (pick.primitive.key != undefined && pick.primitive.key.includes("Ruler")) {
//            //create a button to delete
//            debugger
//            var rulerToRemove = scene.primitives._primitives.find(x => x.key == pick.primitive.key);
//            primitives.remove(rulerToRemove);
//            var labelsToRemove = labels._labels.filter(x => x.id.includes(pick.primitive.key));
//            if (labelsToRemove) {
//                for (var i = 0; i < labelsToRemove.length; i++) {
//                    labels.remove(labelsToRemove[i]);
//                }
//            }
//        }
//    }
//}

//////////////////////Material definitions////////////////////////////

var materialRedGrid = new Cesium.Material({
    fabric: {
        type: 'Color',
        uniforms: {
            color: Cesium.Color.RED,
            cellAlpha: 0.3,
            //lineCount: new Cesium.Cartesian2(8, 8),
            //lineThickness: new Cesium.Cartesian2(1.0, 1.0)
        }
    }
});
var materialBlueGrid = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.BLUE,
            cellAlpha: 0.3,
            lineCount: new Cesium.Cartesian2(1, 2),
            lineThickness: new Cesium.Cartesian2(0.5, 2.0)
        }
    }
});

var materialBlackGrid = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.BLACK,
            cellAlpha: 0.3,
            lineCount: new Cesium.Cartesian2(1, 2),
            lineThickness: new Cesium.Cartesian2(0.1, 2.0),
        }
    }
});

var materialOrangeGrid = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.ORANGE,
            cellAlpha: 0.3,
            lineCount: new Cesium.Cartesian2(1, 2),
            lineThickness: new Cesium.Cartesian2(0.1, 2.0),
        }
    }
});

var materialGreenYellowGrid = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.GREENYELLOW,
            cellAlpha: 0.3,
            lineCount: new Cesium.Cartesian2(1, 2),
            lineThickness: new Cesium.Cartesian2(0.1, 2.0),
        }
    }
});

var materialGridForRuler = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.RED,
            cellAlpha: 1.0,
        }
    }
});


var materialYellowGrid = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.YELLOW,
            cellAlpha: 0.3
            //lineCount: new Cesium.Cartesian2(8, 8),
            //lineThickness: new Cesium.Cartesian2(1.0, 1.0)
        }
    }
});
var materialGreenGrid = new Cesium.Material({
    fabric: {
        type: 'Grid',
        uniforms: {
            color: Cesium.Color.GREEN,
            cellAlpha: 0.3,
            //lineCount: new Cesium.Cartesian2(8, 8),
            //lineThickness: new Cesium.Cartesian2(1.0, 1.0)
        }
    }
});
var currentBillboardToDestroy;
var BillboardList;
function writeCoordinatesOfMarkerToTextBox(currPosition) {
    var cartographic = Cesium.Cartographic.fromCartesian(currPosition);
    var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
    var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
    //var heightString = cartographic.height.toFixed(2);

    var str = `${latitudeString} , ${longitudeString}`;
    var input = document.getElementById("PositionForTrackTextBox");
    if (input) {
        input.value = str;
    }
}

function getLabelPositionForRuler(heading, position) {
    var centerPixel = new Cesium.Cartesian2();
    if (Cesium.defined(position)) {
        var centerScreenCoordinates = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, position);
        centerPixel.x = centerScreenCoordinates.x;
        centerPixel.y = centerScreenCoordinates.y;
    }
    heading = Cesium.Math.toRadians(heading);
    var headingPixelOffset = new Cesium.Cartesian2(Math.cos(heading), Math.sin(heading));
    headingPixelOffset = Cesium.Cartesian2.multiplyByScalar(headingPixelOffset, 40, headingPixelOffset);

    var labelPixelPosition = new Cesium.Cartesian2(centerPixel.x + headingPixelOffset.x, centerPixel.y + headingPixelOffset.y);

    var labelPosition = convertingCar2ToCar3ForBearingLine(labelPixelPosition);

    if (Cesium.defined(labelPosition)) {
        var posToRet = labelPosition;
    }
    else {
        var posToRet = position;
    }
    return posToRet;
}


