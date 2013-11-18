define(
    [
        "rexster/ajax",
        "rexster/history",
        "underscore",
        "rexster/graph-viz"
    ],
    elementToolbar = function (ajax, history, _, graphViz) {
        var toolbar;
        var mediator;
        var element;
        var graphName;

        function addButton(tooltipText, icon, onClick) {
            var toolbarButtonGraph = toolbar.append("<li/>").children().last();

            toolbarButtonGraph.addClass("fixed column ui-state-default ui-corner-all pager-button")
                .css({"width": "30px"});
            toolbarButtonGraph.attr("title", tooltipText);

            toolbarButtonGraph.hover(function(){
                $(this).addClass("ui-state-hover");
                $(this).removeClass("ui-state-default");
            },
            function(){
                $(this).addClass("ui-state-default");
                $(this).removeClass("ui-state-hover");
            });

            var featureBrowsed = element._type == "vertex" ? "vertices" : "edges";

            var toolbarButtonGraphLink = toolbarButtonGraph.append("<a/>").children().first();
            toolbarButtonGraphLink.attr("href", "/doghouse/main/graph/" + graphName + "/" + featureBrowsed + "/" + element._id);
            toolbarButtonGraphLink.addClass(icon);
            $(toolbarButtonGraphLink).click(onClick);

            return toolbarButtonGraph;
        }

        var Constr = function (currentGraphName, ele, med) {
            toolbar = $("<ul/>");
            // extra css here overrides some elastic css settings
            toolbar.addClass("unit on-1 columns")
                .css({ "margin" : "0px", "margin-left" : "10px" });

            element = ele;
            mediator = med;
            graphName = currentGraphName;
        }

        Constr.prototype = {
            constructor: elementToolbar,
            version: "1.0",
            build : function() {
                return toolbar;
            },
            addNavigateButton : function(){
                addButton("View Element", "ui-icon ui-icon-arrow-4-diag", function(event) {
                    event.preventDefault();
                    var uri = $(this).attr('href');
                    var split = uri.split("/");
                    history.historyPush(uri);

                    mediator.panelGraphElementViewSelected(split[5], split.slice(6).join("/"));

                });

                return this;
            },
            addVisualizationButton : function(){
                function onListElementClick(element, viz) {
                    return function(){
                        ajax.getVertexBoth(graphName, element._id, function (results) {
                            groupedGraph = _(results.results).reduce(function(types, n) { 
                                if (!types[n.type]) {
                                    types[n.type] = [];
                                }

                                types[n.type].push(n);

                                return types;
                            }, {});

                            var jitGraphData = _(groupedGraph).map(function(n,t) {
                                return {
                                    id : id++,
                                    name : "" + t + "(" + n.length + ")",
                                    data : setNodeShapeAndColor(t,n),
                                    adjacencies: [
                                        element._id
                                    ]
                                };
                            }); 

                            ajax.getVertexElement(graphName, element._id, function(results){
                                jitGraphData = _([{
                                    id:"" + results.results._id,
                                    name:"" + results.results.name,
                                    adjacencies:[],
                                    data:setNodeShapeAndColor(results.results.type),
                                    }]).union(jitGraphData);
                            },null, false);

                            // viz = new graphViz("dialogGraphVizMain", jitGraphData, viz.handlers);
                            var handles = {
                            onNodeRightClick : function(node) {
                                ajax.getVertexBoth(graphName, node.data._id, function (results) {
                                        var jitDataToSum = _(results.results).map(function(n) {
                                            return {
                                                id : "" + n._id,
                                                name : "" + n.name,
                                                data : setNodeShapeAndColor(n),
                                                adjacencies: [
                                                    "" + node.data._id
                                                ]
                                            };
                                        });

                                        jitDataToSum = _([{
                                            id:"" + node.data._id,
                                            name:"" + node.data.name,
                                            adjacencies:[],
                                            data:setNodeShapeAndColor(node),
                                            }]).union(jitDataToSum);

                                        viz.sum(jitDataToSum);
                                        viz.centerOnComplete("" + node.data._id);
                                    },
                                    function (jqXHR, textStatus, errorThrown) {
                                    }
                                );
                            },
                            onNodeClick : function(node) {
                                $("#dialogGraphVizRight").empty();

                                div_element = $("#dialogGraphVizRight");
                                container = $('<div/>');
                                $(container).appendTo(div_element);
                                $(container).addClass('json-widget').css({'padding': "4px" });

                                header = $('<div/>');
                                $(header).appendTo(container);
                                $(header).addClass('json-widget-header' + ' ui-corner-top')
                                    .css({ 'cursor': 'hand', //'float': 'left',
                                        'text-align': 'center'
                                    });
                                $(header).text(element.type + ": " + element.name + " -> Type: " + node.data.type);
                                
                                // $(header).click(function(event) {
                                //     $(header).next().toggleClass('ui-helper-hidden');
                                //     return false;
                                // });
                                                                
                                for (i = 0; i < node.data.elements.length; i++) { 
                                    // content = $('<div/>', {
                                    //             id: i })
                                  
                                    content = $(document.createElement('div'));
                                    content.hover(toggleHighlight());
                                    content.text(node.data.elements[i]._id  + ': ' + node.data.elements[i].name);
                                    content.addClass("json-widget-content" + ' ui-corner-bottom').css({ 'white-space': 'nowrap' });
                                    content.click(onListElementClick(node.data.elements[i], viz));
                                    content.appendTo(container);
                                
                                  
                                }
                            },
                            onEdgeClick : function(nodeFrom, nodeTo){
                                $("#dialogGraphVizRight").empty();

                                ajax.getVertexEdges(graphName, nodeFrom.id, function(result){
                                    _(_(result.results).filter(function(e){ return e._inV == nodeTo.id || e._outV == nodeTo.id; })).each(function(e){
                                        $("#dialogGraphVizRight").append("<div/>");

                                        var metaDataLabel = "Type:[" + e._type + "] ID:[" + e._id + "]"  + " In:[" + e._inV + "] Out:[" + e._outV + "] Label:[" + e._label + "]";
                                        $("#dialogGraphVizRight").children().last().jsonviewer({
                                            "jsonName": metaDataLabel,
                                            "jsonData": e,
                                            "outerPadding":"0px",
                                            "showToolbar" : false,
                                            "overrideCss" : {
                                                "highlight":"json-widget-highlight-vertex",
                                                "header":"json-widget-header-vertex",
                                                "content" :"json-widget-content-vertex"
                                            }
                                        });
                                    });
                                })
                            }
                        };
                            viz.reset();
                            viz = new graphViz("dialogGraphVizMain", jitGraphData, handles);
                            viz.animate()
                            
                        },
                        function (jqXHR, textStatus, errorThrown) {
                        }
                        );
                    }
                }

                function toggleHighlight(element) {
                    return function(){
                        $('this').toggleClass("json-widget-highlight");
                    }
                }
                function setNodeShapeAndColor(type, elements) {
                    // node types are ‘circle’, ‘triangle’, ‘rectangle’, ‘star’, ‘ellipse’ and ‘square’

                    data = {};
                    data["type"] = type;
                    data["elements"] = elements;

                    switch (type) {
                        // Vertices
                        case "book":
                            data["$type"] = "rectangle";
                            data["$color"] = "Orange";
                            break;
                        case "course":
                            data["$type"] = "circle";
                            data["$color"] = "Thistle";
                            break;
                        case "concept":
                            data["$type"] = "triangle";
                            data["$color"] = "Mediumvioletred";
                            break;
                        case "module":
                            data["$type"] = "rectangle";
                            data["$color"] = "Orange";
                            break;
                        case "context":
                            data["$type"] = "ellipse";
                            data["$color"] = "Mediumspringgreen";
                            break;
                        case "taxonomy":
                            data["$type"] = "square";
                            data["$color"] = "Gold";
                            break;
                        case "taxon":
                            data["$type"] = "circle";
                            data["$color"] = "Deeppink";
                            break;   

                        case "song":
                            data["$type"] = "star";
                            data["$color"] = "Crimson";
                            break;

                        // Edges
                        case "owns":
                            data["$type"] = "arrow";
                            data["$color"] = "Slategray";
                            break;
                        case "extends":
                            data["$type"] = "arrow";
                            data["$color"] = "Tomato";
                            break;
                        case "references":
                            data["$type"] = "arrow";
                            data["$color"] = "Thistle";
                            break;
                        case "prerequisite":
                            data["$type"] = "arrow";
                            data["$color"] = "Lightskyblue";
                            break;
                        case "contains":
                            data["$type"] = "arrow";
                            data["$color"] = "Orange";
                            break;
                        case "taught_by":
                        case "assessed_by":
                            data["$type"] = "arrow";
                            data["$color"] = "Dodgerblue";
                            break;
                        case "can_recommend":
                            data["$type"] = "arrow";
                            data["$color"] = "Lightgrey";
                            break;
                        case "tags":
                            data["$type"] = "arrow";
                            data["$color"] = "Lawngreen";
                            break;

                        case "followed_by":
                            data["$type"] = "arrow";
                            data["$color"] = "Lawngreen";
                            break;

                    }

                    return data;

                };

                addButton("Visualize", "ui-icon ui-icon-zoomin", function(event) {
                    event.preventDefault();
                    var uri = $(this).attr('href');
                    var split = uri.split("/");
                    var selectedVertexIdentifier = split[6];
                    var viz;

                    $("#dialogGraphViz" ).dialog({
                        height: 625,
                        width: 800,
                        modal: true,
                        close: function(event, ui) {
                            if (typeof viz != "undefined") {
                                viz.reset();
                            }

                            $("#dialogGraphVizRight").empty();
                        },
                        buttons: {
                            Close: function() {
                                $(this).dialog("close");
                            }
                        }
                    });

                    ajax.getVertexBoth(graphName, selectedVertexIdentifier, function(results) {
                        id = 0;
                        groupedGraph = _(results.results).reduce(function(types, n) { 
                            if (!types[n.type]) {
                                //types[n.type] = 0
                                types[n.type] = [];
                            }

                            // types[n.type] += 1;
                            types[n.type].push(n);

                            return types;
                        }, {});

                        var jitGraphData = _(groupedGraph).map(function(n,t) {
                            return {
                                id : id++,
                                name : "" + t + "(" + n.length + ")",
                                data : setNodeShapeAndColor(t,n),
                                adjacencies: [
                                    selectedVertexIdentifier
                                ]
                            };
                        }); 

                        ajax.getVertexElement(graphName, selectedVertexIdentifier, function(results){
                            jitGraphData = _([{
                                id:"" + results.results._id,
                                name:"" + results.results.name,
                                adjacencies:[],
                                data:setNodeShapeAndColor(results.results.type),
                                }]).union(jitGraphData);
                        },null, false);


                        var handlers = {
                            onNodeRightClick : function(node) {
                                ajax.getVertexBoth(graphName, node.data._id, function (results) {
                                        var jitDataToSum = _(results.results).map(function(n) {
                                            return {
                                                id : "" + n._id,
                                                name : "" + n.name,
                                                data : setNodeShapeAndColor(n),
                                                adjacencies: [
                                                    "" + node.data._id
                                                ]
                                            };
                                        });

                                        jitDataToSum = _([{
                                            id:"" + node.data._id,
                                            name:"" + node.data.name,
                                            adjacencies:[],
                                            data:setNodeShapeAndColor(node),
                                            }]).union(jitDataToSum);

                                        viz.sum(jitDataToSum);
                                        viz.centerOnComplete("" + node.data._id);
                                    },
                                    function (jqXHR, textStatus, errorThrown) {
                                    }
                                );
                            },
                            onNodeClick : function(node) {
                                $("#dialogGraphVizRight").empty();

                                div_element = $("#dialogGraphVizRight");
                                container = $('<div/>');
                                $(container).appendTo(div_element);
                                $(container).addClass('json-widget').css({'padding': "4px" });

                                header = $('<div/>');
                                $(header).appendTo(container);
                                $(header).addClass('json-widget-header' + ' ui-corner-top')
                                    .css({ 'cursor': 'hand', //'float': 'left',
                                        'text-align': 'center'
                                    });
                                $(header).text(element.type + ": " + element.name + " -> Type: " + node.data.type);
                                
                                // $(header).click(function(event) {
                                //     $(header).next().toggleClass('ui-helper-hidden');
                                //     return false;
                                // });
                                                                
                                for (i = 0; i < node.data.elements.length; i++) { 
                                    // content = $('<div/>', {
                                    //             id: i })
                                  
                                    content = $(document.createElement('div'));
                                    content.hover(toggleHighlight());
                                    content.text(node.data.elements[i]._id  + ': ' + node.data.elements[i].name);
                                    content.addClass("json-widget-content" + ' ui-corner-bottom').css({ 'white-space': 'nowrap' });
                                    content.click(onListElementClick(node.data.elements[i], viz));
                                    content.appendTo(container);
                                
                                  
                                }
                            },
                            onEdgeClick : function(nodeFrom, nodeTo){
                                $("#dialogGraphVizRight").empty();

                                ajax.getVertexEdges(graphName, nodeFrom.id, function(result){
                                    _(_(result.results).filter(function(e){ return e._inV == nodeTo.id || e._outV == nodeTo.id; })).each(function(e){
                                        $("#dialogGraphVizRight").append("<div/>");

                                        var metaDataLabel = "Type:[" + e._type + "] ID:[" + e._id + "]"  + " In:[" + e._inV + "] Out:[" + e._outV + "] Label:[" + e._label + "]";
                                        $("#dialogGraphVizRight").children().last().jsonviewer({
                                            "jsonName": metaDataLabel,
                                            "jsonData": e,
                                            "outerPadding":"0px",
                                            "showToolbar" : false,
                                            "overrideCss" : {
                                                "highlight":"json-widget-highlight-vertex",
                                                "header":"json-widget-header-vertex",
                                                "content" :"json-widget-content-vertex"
                                            }
                                        });
                                    });
                                })
                            }
                        };

                        viz = new graphViz("dialogGraphVizMain", jitGraphData, handlers);
                        viz.animate();
                    },
                    function(err) {

                    },
                    true);
                });

                return this;
            }
        };

        return Constr;
    });