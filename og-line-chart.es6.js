(function() {
  Polymer({

    is: 'og-line-chart',

    observers: [
      '_redraw(margin, data, cfgXAxis, cfgYAxis, cfgSeries)'
    ],

    properties: {
      /**
      * Width of the Chart.
      *
      * @property width
      */
      width: {
				type: Number,
				value: 960
      },
      /**
      * Height of the Chart.
      *
      * @property height
      */
			height: {
				type: Number,
				value: 300
      },
      /**
      * Chart Margin.
        Default: {top: 30, right: 20, bottom: 40, left: 50}
      *
      * @property margin
      */
			margin: {
				type: Object,
				notify: true,
				value() {
					return {top: 30, right: 20, bottom: 40, left: 50};
				}
			},
      /**
      * Chart Data
      * Format: [{x: Number, y: [y0, y1, y2, y3...]}]
      * @property data
      */
      data: {
				type: Array,
				value() {
					return [];
				}
      },
      /**
       * Show Today Line and subsequently, Historical and Forecast Labels
       *
       * @property showTodayLine
       */
      showTodayLine: {
        type: Boolean,
        value: true
      },
      /**
       * The X-axis point which should be considered as today
       *
       * @property today
       */
      today: {
        type: String
      },
      /**
       * Today Label
       *
       * @property todayLabel
       */
      todayLabel: {
        type: String,
        value: "Today"
      },
      /**
       * Historical Label
       *
       * @property historicalLabel
       */
      historicalLabel: {
        type: String,
        value: "Historical"
      },
      /**
       * Forecast Label
       *
       * @property forecastLabel
       */
      forecastLabel: {
        type: String,
        value: "Forecast"
      },
      /**
       * X Axis Config
       * Eg: {
            "color": "",
            "axisLabel": "",
            "legendLabel": "",
            "inputDateFormat": "",
            "tickFormat": "",
            "tickTimeFormat": "",
            "hideGrid": false,
            "d3NiceType": "",
            "niceTicks": 0,
            "axisColor": "",
            "tickColor": ""
          }
       * @property cfgXAxis
       */
      cfgXAxis: {
        type: Object
      },
      /**
       * Y Axis Config
       * Eg: {
            "hideGrid": false,
            "axisLabel": "",
            "axisColor": "",
            "tickColor": "",
            "niceTicks": 6,
            "tickFormat": "",
            "start": 0
          }
       * @property cfgYAxis
       */
      cfgYAxis: {
        type: Object
      },
      /**
       * Y Axis Series Config
       * Eg: [
            {
              "color": "",
              "dashArray": "",
              "radius": 2,
              "legendLabel": "",
              "tickFormat": "",
              "type": "",
              "interpolation": "",
              "xStart": "",
              "xEnd": ""
            }
          ]
       * @property cfgSeries
       */
      cfgSeries: {
        type: Array,
        value() {
          return [];
        }
      },
      /**
       * Legend Alignment
       * Eg: right, left, center
       *
       * @property legendAlignment
       */
      legendAlignment: {
        type: String,
        value: "left"
      },
      /**
       * DateFormat
       * 
       * Eg: YYYY-MM-DD
       * @property dateFormat
       */
      dateFormat: {
        type: String,
        value: "YYYY-MM-DD"
      },
      /**
       * Time Format
       * Eg: HH:mm:ss
       *
       * @property timeFormat
       */
      timeFormat: {
        type: String,
        value: "HH:mm:ss"
      },
      /**
       * Timezone
       * Eg: UTC
       *
       * @property timeZone
       */
      timeZone: {
        type: String,
        value: "UTC"
      },
      dateRange: {
        type: String,
        computed: 'computeDateRange(fromMoment, toMoment)'
      },
      fromMoment: {
        type: String,
        notify: true
      },
      toMoment: {
        type: String,
        notify: true
      }
    },

    _defaultCfgXAxis: {
      "color": "",
      "axisLabel": "",
      "legendLabel": "",
      "inputDateFormat": "%Q",
      "tickFormat": "",
      "tickTimeFormat": "",
      "hideGrid": false,
      "d3NiceType": "timeDay",
      "niceTicks": 0,
      "axisColor": "",
      "tickColor": ""
    },

    _defaultCfgYAxis: {
      "hideGrid": false,
      "axisLabel": "",
      "axisColor": "",
      "tickColor": "",
      "niceTicks": 6,
      "tickFormat": "",
      "start": 0
    },

    ready() {
      this.scopeSubtree(this.$.chart, true);
    },

    attached() {
      this._setupDefaults();
    },

    draw() {
      this._setupDefaults();
      let d3 = Px.d3, data = this.data;
      if(!data || data.length === 0 || !this.axisData || !this.axisData.x) {return;}
      data = this._massageData(data);
      this._prepareChartingArea();
      this._prepareAxes(data);
      this._drawGridLines(data);
      this._drawTimelineSeparators(data);
      this._drawAxes(data);
      this._drawChart(data);

      this.fire("chart-drawn", {});
    },
    
    _setupDefaults() {
      this.axisData = {x: {}, y: {}};
      this.minimap = {};
      Object.assign(this.axisData.x, this._defaultCfgXAxis, this.cfgXAxis);
      Object.assign(this.axisData.y, this._defaultCfgYAxis, this.cfgYAxis);
      this.cfgSeries = this.cfgSeries || [];

      const updateStyle = (key, val) => {
        if(this.customStyle) {
          this.customStyle['--x-axis-color'] = this.axisData.x.axisColor;
          this.updateStyles();
        } else {
          this.updateStyles({"`${key}`": val});
        }
      };
      
      if(this.axisData.x.axisColor) {
        updateStyle('--x-axis-color', this.axisData.x.axisColor);
      }
      if(this.axisData.x.tickColor) {
        updateStyle('--x-tick-color', this.axisData.x.tickColor);
      }
      if(this.axisData.y.axisColor) {
        updateStyle('--y-axis-color', this.axisData.y.axisColor);
      }
      if(this.axisData.y.tickColor) {
        updateStyle('--y-tick-color', this.axisData.y.tickColor);
      }
    },

    _massageData(data) {
      let d3 = Px.d3;
      // parse the date / time
      this.parseTime = this.axisData.x.inputDateFormat ?
        d3.timeParse(this.axisData.x.inputDateFormat) : null;
      
      data.forEach((d) => {
        if(this.parseTime) {
          d.x = d.timeStamp.getTime ? d.x : this.parseTime(d.timeStamp);
        }
        d.y = [];
        for(let i = 0; i < this.cfgSeries.length; i++) {
          let key = `y${i}`;
          d[key] = d[key] ? (+d[key]) : 0;
          d.y.push(d[key]);
        }
      });
      this.set("fromMoment", Px.moment(data[0].x, 'x'));
      this.set("toMoment", Px.moment(data[data.length-1].x, 'x'));
      return data;
    },
    _prepareChartingArea() {
      let d3 = Px.d3;
      // set the dimensions and margins of the graph
      this.margin = this.margin || {top: 30, right: 20, bottom: 40, left: 50},
      this.adjustedWidth = this.width - this.margin.left - this.margin.right,
      this.adjustedHeight = this.height - this.margin.top - this.margin.bottom - 80;

      this.minimap.margin = {
        top: 10, 
        right: this.margin.right, 
        bottom: 0, 
        left: this.margin.left
      };
      this.minimap.adjustedWidth = this.adjustedWidth;
      this.minimap.adjustedHeight = 40;

      d3.select(this.$.chart).select("svg").remove();
      this.containerSvg = d3.select(this.$.chart).append("svg")
        .attr("viewBox", "0 0 "+this.width+" "+this.height)
        .attr("preserveAspectRatio", "xMidYMid meet");

      this.containerSvg.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", this.adjustedWidth)
        .attr("height", this.height)
        .attr("x", 0)
        .attr("y", 0);

      this.svg = this.containerSvg
        .append("g")
          .attr("class", "focus")
          .attr("transform",
                "translate(" + this.margin.left + "," + this.margin.top + ")");

      this.minimapSvg = this.containerSvg.append("g")
        .attr("class", "minimap")
        .attr("transform", "translate(" + 
          this.margin.left + "," + (this.adjustedHeight + 
              this.minimap.adjustedHeight + 50) + ")");

      this.toolTip = d3.tip(d3.select(this.$.chart))
        .attr("class", "d3-tip")
        .offset([-8, 0])
        .html(function(d) {
          return d.msg;
        });

      this.containerSvg.call(this.toolTip);
    },
    _prepareAxes(data) {
      // set the ranges
      let d3 = Px.d3;
      if(this.parseTime) {
        this.x= d3.scaleTime().range([0, this.adjustedWidth]);
        this.minimap.x = d3.scaleTime().range([0, this.adjustedWidth]);
      } else {
        this.x= d3.scaleLinear().range([0, this.adjustedWidth]);
        this.minimap.x = d3.scaleLinear().range([0, this.adjustedWidth]);
      }
      this.y = d3.scaleLinear().range([this.adjustedHeight, 0]).clamp(true);
      this.minimap.y = d3.scaleLinear().range([this.minimap.adjustedHeight, 0]).clamp(true);

      let x = this.x, y = this.y;
      this.todayAsDate = this.today && this.parseTime ? this.parseTime(this.today) : null;

      let yMax = d3.max(data, function(d) {
        return d.y.reduce((a,b) => {
          return Math.max(a,b);
        })
      });
      let yMin = d3.min(data, function(d) {
        return d.y.reduce((a,b) => {
          return Math.min(a,b);
        })
      });
      yMin = this.axisData.y.start ? this.axisData.y.start : yMin;

      x.domain(d3.extent(data, function(d) { return d.x; }));
      this.minimap.x.domain(x.domain());
      if(this.axisData.x.d3NiceType instanceof Function) {
        x.nice(this.axisData.x.d3NiceType());
        this.minimap.x.nice(this.axisData.x.d3NiceType());
      } else if(this.parseTime) {
        x.nice(d3[this.axisData.x.d3NiceType]);
        this.minimap.x.nice(d3[this.axisData.x.d3NiceType]);
      } else if(this.axisData.x.niceTicks) {
        x.nice(this.axisData.x.niceTicks);
        this.minimap.x.nice(this.axisData.x.niceTicks);
      } else {
        x.nice();
        this.minimap.x.nice();
      }
      y.domain([yMin, yMax]);
      this.minimap.y.domain(y.domain());
      if(this.axisData.y.niceTicks) {
        y.nice(this.axisData.y.niceTicks);
        this.minimap.y.nice(this.axisData.y.niceTicks);
      }
    },
    _drawGridLines(data) {
      let x = this.x, y = this.y, d3 = Px.d3;
      let yScaledMin = y(y.domain()[0]);
      if(!this.axisData.x.hideGrid) {
        this.svg.append("g")
          .attr("class", "grid x-grid")
          .call(d3.axisBottom(x)
              // .ticks(this.axisData.x.totalGridLines || 10)
              .tickSize(this.adjustedHeight)
              .tickFormat(""));
      }

      if(!this.axisData.y.hideGrid) {
        this.svg.append("g")
          .attr("class", "grid y-grid")
          .call(d3.axisLeft(y)
              .ticks(this.axisData.y.totalGridLines || 5)
              .tickSize(-this.adjustedWidth)
              .tickFormat(""));
      }
    },
    _drawTimelineSeparators(data) {
      let x = this.x, y = this.y, d3 = Px.d3;
      if(this.showTodayLine) {
        this.svg.append("svg:line")
          .attr("class", "today")
          .attr("x1", x(this.todayAsDate))
          .attr("y1", this.adjustedHeight+18)
          .attr("x2", x(this.todayAsDate))
          .attr("y2", -7);

        if(this.historicalLabel) {
          this.svg.append("text")
            .attr("class", "today-text")
            .attr("x", (x(x.domain()[0]) + x(this.todayAsDate))/2)
            .attr("y", -9)
            .text(this.historicalLabel);
        }

        if(this.todayLabel) {
          this.svg.append("text")
            .attr("class", "today-text")
            .attr("x", x(this.todayAsDate)-10)
            .attr("y", -9)
            .text(this.todayLabel);
        }

        if(this.forecastLabel) {
          this.svg.append("text")
            .attr("class", "today-text")
            .attr("x", (x(x.domain()[1]) * 0.8))
            .attr("y", -9)
            .text(this.forecastLabel);
        }
      }
    },

    _drawAxes(data) {
      let x = this.x, y = this.y, d3 = Px.d3;

      // Add the X Axis
      let _xAxis = d3.axisBottom(x);
      this.xAxis = _xAxis;

      let _minimapXAxis = d3.axisBottom(this.minimap.x);

      if(this.parseTime && this.axisData.x.tickTimeFormat) {
        _xAxis.tickFormat(d3.timeFormat(this.axisData.x.tickTimeFormat));
        _minimapXAxis.tickFormat(d3.timeFormat(this.axisData.x.tickTimeFormat));
      } else if(this.axisData.x.tickFormat) {
        _xAxis.tickFormat(d3.format(this.axisData.x.tickFormat));
        _minimapXAxis.tickFormat(d3.format(this.axisData.x.tickFormat));
      }
      if(this.axisData.x.niceTicks) {
        _xAxis.ticks(this.axisData.x.niceTicks);
        _minimapXAxis.ticks(this.axisData.x.niceTicks);
      }
      this.svg.append("g")
          .attr("transform", "translate(0," + this.adjustedHeight + ")")
          .attr("class", "x-axis")
          .call(_xAxis);
      
      this.minimapSvg.append("g")
        .attr("class", "x-axis minimap-x-axis")
        .attr("transform", "translate(0," + this.minimap.adjustedHeight + ")")
        .call(_minimapXAxis);

      // Add the Y Axis
      let _yAxis = d3.axisLeft(y).ticks(this.axisData.y.niceTicks || 6);
      if(this.axisData.y.tickFormat) {
        _yAxis.tickFormat(d3.format(this.axisData.y.tickFormat));
      }
      this.svg.append("g")
          .attr("class", "y-axis")
          .call(_yAxis);

      if(this.axisData.y.axisLabel) {
        this.svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - this.margin.left)
          .attr("x",0 - (this.adjustedHeight / 2))
          .attr("dy", "1em")
          .attr("class", "y-axis-label")
          .text(this.axisData.y.axisLabel);
      }

      if(this.axisData.x.axisLabel) {
        this.svg.append("text")
          .attr("dy", "1em")
          .attr("class", "x-axis-label")
          .attr("text-anchor", "middle")
          .attr("transform", "translate("+ 
            (this.adjustedWidth/2) +","+(this.adjustedHeight + this.margin.top)+")")
          .text(this.axisData.x.axisLabel);
      }
    },

    _drawChart(data) {
      let x = this.x, y = this.y, d3 = Px.d3;

      this.cfgSeries.forEach((_series, idx) => {
        
        let filteredData = data.filter((_datum) => {
          if(!_series.xStart && !_series.xEnd) {
            return true;
          }
          let result = true;
          if(_series.xStart) {
            let scaledXStart = this.parseTime ? this.parseTime(_series.xStart) : +_series.xStart;
            result = x(_datum.x) >= x(scaledXStart);
          }
          if(result && _series.xEnd) {
            let scaledXEnd = this.parseTime ? this.parseTime(_series.xEnd) : +_series.xEnd;
            return x(_datum.x) <= x(scaledXEnd);
          }
          return result;
        });


        if(this.cfgSeries[idx].radius !== 0) {
          _series.radius = this.cfgSeries[idx].radius || 2;
        }
        const isLineChart = this.cfgSeries[idx].type === "line";

        if(isLineChart) {
          this._drawLineChart(_series, filteredData, idx);
        }
        //TODO: Move dots along zoom
        // this.svg.selectAll(".dot")
        //   .data(filteredData)
        //   .enter()
        //     .append("circle")
        //     .attr("r", _series.radius)
        //     .attr("cx", (d, i) => x(d.x))
        //     .attr("cy", (d) => y(d.y[idx]))
        //     .attr("fill", _series.color || "steelblue")
        //     .attr("class", "series-circle-"+idx)
        //     .on('mouseover', (d, i) => {
        //       d3.select(this)
        //         .attr('r', _series.radius + 2);
        //       let prefix = _series.label ? _series.label + ": " : "";
        //       d.msg = prefix + d.y[idx];
        //       this.toolTip.show(d);
        //     })
        //     .on('mouseout', (d) => {
        //       d3.select(this)
        //         .attr('r', _series.radius);
        //       this.toolTip.hide(d);
        //     });
      });
      this._drawBrushAndZoomForMinimap();
    },

    _drawLineChart(_series, filteredData, idx) {
      let x = this.x, y = this.y, d3 = Px.d3,
          minimapX = this.minimap.x, minimapY = this.minimap.y;
      let line = d3.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y[idx]); });

      let minimapLine = d3.line()
        .x(function(d) { return minimapX(d.x); })
        .y(function(d) { return minimapY(d.y[idx]); });

      this.lines = this.lines || [];
      this.lines.push(line);
      
      if(this.cfgSeries[idx].interpolation) {
        line.curve(d3[this.cfgSeries[idx].interpolation]);
        minimapLine.curve(d3[this.cfgSeries[idx].interpolation]);
      }

      this.svg.append("path")
        .data([filteredData])
        .attr("class", `series-line series-line-${idx} series-circle-${idx}`)
        .style("stroke", _series.color || "steelblue")
        .style("stroke-dasharray", _series.dashArray || "0,0")
        .attr("fill", "transparent")
        .attr("d", line)
        .style("pointer-events", "none");

      this.minimapSvg.append("path")
        .data([filteredData])
        .attr("class", `minimap-line minimap-series-${idx}`)
        .style("stroke", _series.color || "steelblue")
        .style("stroke-dasharray", _series.dashArray || "0,0")
        .attr("fill", "transparent")
        .attr("d", minimapLine)
        .style("pointer-events", "none");
    },

    _drawBrushAndZoomForMinimap() {
      let x = this.x, y = this.y, d3 = Px.d3, me = this;

      this.brushed = () => {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        let s = d3.event.selection || me.minimap.x.range();
        x.domain(s.map(me.minimap.x.invert, me.minimap.x));
        me.lines && me.lines.forEach((_line, idx) => {
          me.svg.select(`.series-line-${idx}`).attr("d", _line);
          me.svg.select(`.series-circle-${idx}`).attr("d", _line);
        });
        me.svg.select(".x-axis").call(me.xAxis);
        me.svg.select(".zoom").call(me.zoom.transform, 
          d3.zoomIdentity
            .scale(me.adjustedWidth / (s[1] - s[0]))
            .translate(-s[0], 0));
        me.set("fromMoment", Px.moment(x.domain()[0], 'x'));
        me.set("toMoment", Px.moment(x.domain()[1], 'x'));
      }

      this.zoomed = () => {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        let t = d3.event.transform;
        x.domain(t.rescaleX(me.minimap.x).domain());
        me.lines && me.lines.forEach((_line, idx) => {
          me.svg.select(`.series-line-${idx}`).attr("d", _line);
          me.svg.select(`.series-circle-${idx}`).attr("d", _line);
        })
        me.svg.select(".x-axis").call(me.xAxis);
        me.minimapSvg.select(".brush").call(me.brush.move, x.range().map(t.invertX, t));
        me.set("fromMoment", Px.moment(x.domain()[0], 'x'));
        me.set("toMoment", Px.moment(x.domain()[1], 'x'));
      };

      this.brush = d3.brushX()
        .extent([[0, 0], [this.adjustedWidth, this.minimap.adjustedHeight]])
        .handleSize(6)
        .on("start brush end", this.brushed);

      this.zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [this.adjustedWidth, this.height]])
        .extent([[0, 0], [this.adjustedWidth, this.height]])
        .on("zoom", this.zoomed);
  
      this.minimapSvg.append("g")
        .attr("class", "brush")
        .call(this.brush)
        .call(this.brush.move, this.x.range());
  
      this.containerSvg.append("rect")
        .attr("class", "zoom")
        .attr("width", this.adjustedWidth)
        .attr("height", this.minimap.adjustedHeight)
        .attr("transform", "translate(" + 
          this.margin.left + "," + (this.adjustedHeight + 
            this.minimap.adjustedHeight + 50) + ")")
        .call(this.zoom);
    },

    _updateBrush(event, range) {
      console.log(range)
      if(!range || !this.brush) {return;}
      let x = this.x, y = this.y, d3 = Px.d3, me = this;
      let s = me.minimap.x.range();
      x.domain(s.map(me.minimap.x.invert, me.minimap.x));
      this.minimapSvg
        .select(".brush")
        .call(this.brush.move, 
          [x(range.momentObjs.from.toDate()), x(range.momentObjs.to.toDate())]);
    },

    _redraw(margin, data, cfgXAxis, cfgYAxis, cfgSeries) {
      if(!data || !data.length) {
        return;
      }
      Px.d3.select(this.$.chart).select("svg").remove();
      this.draw();
    },

    computeDateRange(fromMoment, toMoment) {
      return {
        "from": fromMoment.format('YYYY-MM-DDThh:mm:ss'),
        "to": toMoment.format('YYYY-MM-DDThh:mm:ss')
      };
    },

    _toggleSeries(event) {
      const label = "series-circle-" + event.model.get("idx");

      this[label] = !this[label];
			if(this[label]) {
				this.querySelectorAll("."+label).forEach((elt) => {
					elt.style.display = "none";
				});
			} else {
				this.querySelectorAll("."+label).forEach((elt) => {
					elt.style.display = "block";
				});
			}
    }
  });
})();
