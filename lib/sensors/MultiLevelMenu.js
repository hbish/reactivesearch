"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _classnames = require("classnames");

var _classnames2 = _interopRequireDefault(_classnames);

var _reactivebase = require("@appbaseio/reactivebase");

var _StaticSearch = require("../addons/StaticSearch");

var _StaticSearch2 = _interopRequireDefault(_StaticSearch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* eslint max-lines: 0 */


var _ = require("lodash");

var MultiLevelMenu = function (_Component) {
	_inherits(MultiLevelMenu, _Component);

	function MultiLevelMenu(props) {
		_classCallCheck(this, MultiLevelMenu);

		var _this = _possibleConstructorReturn(this, (MultiLevelMenu.__proto__ || Object.getPrototypeOf(MultiLevelMenu)).call(this, props));

		_this.state = {
			items: [],
			storedItems: [],
			rawData: {
				hits: {
					hits: []
				}
			},
			subItems: [],
			selectedValue: null
		};
		_this.channelObj = [];
		_this.channelId = [];
		_this.channelListener = [];
		_this.defaultSelected = _this.props.defaultSelected;
		_this.customQuery = _this.customQuery.bind(_this);
		_this.firstLevelAggCustomQuery = _this.firstLevelAggCustomQuery.bind(_this);
		_this.secondLevelAggCustomQuery = _this.secondLevelAggCustomQuery.bind(_this);
		_this.type = "Term";
		return _this;
	}

	// Get the items from Appbase when component is mounted


	_createClass(MultiLevelMenu, [{
		key: "componentWillMount",
		value: function componentWillMount() {
			this.initialize();
		}
	}, {
		key: "initialize",
		value: function initialize() {
			this.setQueryInfo();
			this.createChannel();
		}

		// stop streaming request and remove listener when component will unmount

	}, {
		key: "componentWillUnmount",
		value: function componentWillUnmount() {
			this.removeChannels();
		}
	}, {
		key: "removeChannels",
		value: function removeChannels() {
			this.channelId.forEach(function (channelId) {
				_reactivebase.AppbaseChannelManager.stopStream(channelId);
			});
			this.channelListener.forEach(function (channelListener) {
				channelListener.remove();
			});
		}
	}, {
		key: "componentWillUpdate",
		value: function componentWillUpdate() {
			var _this2 = this;

			setTimeout(function () {
				if (!_.isEqual(_this2.defaultData, _this2.props.data)) {
					_this2.defaultData = _this2.props.data;
					_this2.removeChannels();
					_this2.initialize();
				}
			}, 300);
		}

		// build query for this sensor only

	}, {
		key: "customQuery",
		value: function customQuery(record) {
			var query = null;
			function generateRangeQuery(appbaseField) {
				return record.map(function (singleRecord, index) {
					return {
						term: _defineProperty({}, appbaseField[index], singleRecord)
					};
				});
			}
			if (record) {
				query = {
					bool: {
						must: generateRangeQuery(this.props.appbaseField)
					}
				};
			}
			return query;
		}

		// set the query type and input data

	}, {
		key: "setQueryInfo",
		value: function setQueryInfo() {
			var obj = {
				key: this.props.componentId,
				value: {
					queryType: this.type,
					inputData: this.props.appbaseField[0],
					customQuery: this.props.customQuery ? this.props.customQuery : this.customQuery
				}
			};
			_reactivebase.AppbaseSensorHelper.selectedSensor.setSensorInfo(obj);
			function setInternalQuery(key, level) {
				var obj = {
					key: key,
					value: {
						queryType: "term",
						inputData: this.props.appbaseField[level],
						customQuery: function customQuery() {
							return null;
						}
					}
				};
				_reactivebase.AppbaseSensorHelper.selectedSensor.setSensorInfo(obj);
				var obj1 = {
					key: key,
					value: ""
				};
				_reactivebase.AppbaseSensorHelper.selectedSensor.set(obj);
			}
			setInternalQuery.call(this, "subCategory", 0);
			setInternalQuery.call(this, "lastCategory", 1);
		}
	}, {
		key: "getReact",
		value: function getReact(level) {
			var react = {
				aggs: {
					key: this.props.appbaseField[level],
					size: this.props.size
				},
				and: []
			};
			if (level === 1) {
				react.aggs.customQuery = this.firstLevelAggCustomQuery;
				react.and.push('subCategory');
			} else if (level === 2) {
				react.aggs.customQuery = this.secondLevelAggCustomQuery;
				react.and.push('lastCategory');
			}
			return react;
		}

		// Create a channel which passes the react and receive results whenever react changes

	}, {
		key: "createChannel",
		value: function createChannel() {
			var level = 0;
			for (var _level = 1; _level < this.props.appbaseField.length; _level++) {
				var react = this.getReact(_level);
				// create a channel and listen the changes
				this.channelObj[_level] = _reactivebase.AppbaseChannelManager.create(this.context.appbaseRef, this.context.type, react);
				this.channelId[_level] = this.channelObj[_level].channelId;
				this.channelListener[_level] = this.localChannel(_level, react);
				// this.listenLoadingChannel(channelObj, "loadListenerParent");
			}
			this.setInitialData();
		}
	}, {
		key: "setInitialData",
		value: function setInitialData() {
			var _this3 = this;

			setTimeout(function () {
				var data = {
					aggregations: _this3.props.data
				};
				_this3.setSensorData(data, 0);
			}, 100);
		}
	}, {
		key: "localChannel",
		value: function localChannel(level, react) {
			var _this4 = this;

			return this.channelObj[level].emitter.addListener(this.channelId[level], function (res) {
				if (res.appliedQuery) {
					if (level === 1) {
						_this4.setSensorData(res.data, level);
					} else if (level === 2) {
						_this4.setData(res.data);
					}
				}
			});
		}
	}, {
		key: "setSensorData",
		value: function setSensorData(data, level) {
			var obj = {
				levelName: "firstLevelMenu",
				key: "subCategory"
			};
			if (level === 1) {
				obj.levelName = "secondLevelMenu";
				obj.key = "lastCategory";
			}
			if (data && data.aggregations && data.aggregations) {
				if (level === 0) {
					this[obj.levelName] = data.aggregations.map(function (item) {
						return item.value;
					});
				} else if (level === 1) {
					this[obj.levelName] = data.aggregations;
				}
			}

			var sensorObj = {
				key: obj.key,
				value: this[obj.levelName]
			};
			_reactivebase.AppbaseSensorHelper.selectedSensor.set(sensorObj, true);
		}
	}, {
		key: "firstLevelAggCustomQuery",
		value: function firstLevelAggCustomQuery() {
			var _this5 = this;

			var query = null;
			if (this.firstLevelMenu) {
				query = {};
				this.firstLevelMenu.forEach(function (item) {
					var aggQuery = _this5.createAggquery(item, 0, [item]);
					query[aggQuery.key] = aggQuery.value;
				});
			}
			return query;
		}
	}, {
		key: "secondLevelAggCustomQuery",
		value: function secondLevelAggCustomQuery() {
			var _this6 = this;

			var query = null;
			if (this.secondLevelMenu) {
				query = {};
				Object.keys(this.secondLevelMenu).forEach(function (item) {
					var combineItems = [item];
					_this6.secondLevelMenu[item][_this6.props.appbaseField[1]].buckets.forEach(function (nestedItem) {
						var aggQuery = _this6.createAggquery(item + '@rbc-level-rbc@' + nestedItem.key, 1, [item, nestedItem.key]);
						query[aggQuery.key] = aggQuery.value;
					});
				});
			}
			return query;
		}
	}, {
		key: "createAggquery",
		value: function createAggquery(label, level, items) {
			var obj = {
				key: label
			};
			obj.value = {
				"filter": this.getAggFilterQuery(items),
				"aggs": _defineProperty({}, this.props.appbaseField[level + 1], {
					"terms": {
						"field": this.props.appbaseField[level + 1]
					}
				})
			};
			return obj;
		}
	}, {
		key: "getAggFilterQuery",
		value: function getAggFilterQuery(items) {
			var _this7 = this;

			var query = {
				bool: {
					must: []
				}
			};
			items.forEach(function (item, index) {
				var obj = {
					"term": _defineProperty({}, _this7.props.appbaseField[index], item)
				};
				query.bool.must.push(obj);
			});
			return query;
		}
	}, {
		key: "setData",
		value: function setData(data) {
			var _this8 = this;

			var finalData = {};
			Object.keys(data.aggregations).forEach(function (level1) {
				var menu = level1.split('@rbc-level-rbc@');
				var finalMenu = data.aggregations[level1][_this8.props.appbaseField[2]].buckets.map(function (item) {
					return item.key;
				});
				if (Object.keys(finalData).indexOf(menu[0]) < 0) {
					finalData[menu[0]] = _defineProperty({}, menu[1], finalMenu);
				} else {
					finalData[menu[0]][menu[1]] = finalMenu;
				}
			});
			this.setState({
				finalData: finalData
			});
		}
	}, {
		key: "addItemsToList",
		value: function addItemsToList(newItems, level) {
			var _this9 = this,
			    _setState;

			newItems = newItems.map(function (item) {
				item.key = item.key.toString();
				item.status = !!(_this9.defaultSelected && _this9.defaultSelected.indexOf(item.key) > -1);
				return item;
			});
			var itemVar = void 0;
			if (level === 0) {
				itemVar = "items";
			} else if (level === 1) {
				itemVar = "subItems";
			} else if (level === 2) {
				itemVar = "lastItems";
			}
			this.setState((_setState = {}, _defineProperty(_setState, itemVar, newItems), _defineProperty(_setState, "storedItems", newItems), _setState));
		}
	}, {
		key: "handleHover",
		value: function handleHover(selectedValue) {
			this.setState({
				selectedValue: selectedValue
			});
		}
	}, {
		key: "renderItems",
		value: function renderItems(items, level) {
			var _this10 = this;

			if (this.state.finalData) {
				return this.props.data.map(function (item) {
					var cx = (0, _classnames2.default)({
						"rbc-item-active": item.value === _this10.state.selectedValue,
						"rbc-item-inactive": !(item.value === _this10.state.selectedValue)
					});
					return _react2.default.createElement(
						"li",
						{ key: item.value },
						_react2.default.createElement(
							"a",
							{ className: "rbc-list-item " + cx, onMouseEnter: function onMouseEnter() {
									return _this10.handleHover(item.value);
								} },
							_react2.default.createElement(
								"span",
								{ className: "rbc-label" },
								item.label
							)
						)
					);
				});
			}
		}
	}, {
		key: "selectItem",
		value: function selectItem(item, list) {
			var obj = {
				key: this.props.componentId,
				value: [this.state.selectedValue, list, item]
			};
			_reactivebase.AppbaseSensorHelper.selectedSensor.set(obj, true);
		}
	}, {
		key: "filterBlackList",
		value: function filterBlackList(list) {
			var _this11 = this;

			return list.filter(function (item) {
				return _this11.notInBlackListed(item);
			});
		}
	}, {
		key: "notInBlackListed",
		value: function notInBlackListed(item) {
			return this.props.blacklist.indexOf(item) === -1 ? true : false;
		}
	}, {
		key: "renderList",
		value: function renderList() {
			var _this12 = this;

			if (this.state.selectedValue) {
				var data = this.state.finalData[this.state.selectedValue];
				var markup = [];
				var count = 0;

				var _loop = function _loop(list) {
					count += 1;
					if (_this12.notInBlackListed(list) && count <= _this12.props.maxCategories) {
						markup.push(_react2.default.createElement(
							"div",
							{ key: list, className: "rbc-list-container" },
							_react2.default.createElement(
								"h3",
								{ className: "rbc-list-title" },
								list
							),
							_react2.default.createElement(
								"ul",
								null,
								_this12.filterBlackList(data[list]).slice(0, _this12.props.maxItems).map(function (item) {
									return _react2.default.createElement(
										"li",
										{ key: list + "-" + item },
										_react2.default.createElement(
											"a",
											{ onClick: function onClick() {
													return _this12.selectItem(item, list);
												} },
											item
										)
									);
								})
							)
						));
					}
				};

				for (var list in data) {
					_loop(list);
				}

				return _react2.default.createElement(
					"div",
					{ className: "rbc-sublist-container" },
					markup
				);
			}
		}
	}, {
		key: "render",
		value: function render() {
			var _this13 = this;

			var listComponent = _react2.default.createElement(
				"ul",
				{ className: "row rbc-list-container" },
				this.renderItems(this.state.items, 0)
			);

			var cx = (0, _classnames2.default)({
				"rbc-initialloader-active": this.props.initialLoader,
				"rbc-initialloader-inactive": !this.props.initialLoader
			});

			return _react2.default.createElement(
				"div",
				{ className: "rbc rbc-multilevelmenu-container card thumbnail col s12 col-xs-12", onMouseLeave: function onMouseLeave() {
						return _this13.handleHover(null);
					} },
				_react2.default.createElement(
					"div",
					{ className: "rbc rbc-multilevelmenu col s12 col-xs-12 " + cx },
					listComponent
				),
				this.renderList(),
				this.props.initialLoader && this.state.queryStart ? _react2.default.createElement(_reactivebase.InitialLoader, { defaultText: this.props.initialLoader }) : null
			);
		}
	}]);

	return MultiLevelMenu;
}(_react.Component);

exports.default = MultiLevelMenu;


MultiLevelMenu.propTypes = {
	componentId: _react2.default.PropTypes.string.isRequired,
	appbaseField: _react2.default.PropTypes.array.isRequired,
	data: _react2.default.PropTypes.arrayOf(_react2.default.PropTypes.shape({
		label: _react2.default.PropTypes.string.isRequired,
		value: _react2.default.PropTypes.string.isRequired
	})),
	maxCategories: _react2.default.PropTypes.number,
	maxItems: _react2.default.PropTypes.number,
	blacklist: _react2.default.PropTypes.arrayOf(_react2.default.PropTypes.string),
	size: _reactivebase.AppbaseSensorHelper.sizeValidation,
	customQuery: _react2.default.PropTypes.func,
	react: _react2.default.PropTypes.object
};

// Default props value
MultiLevelMenu.defaultProps = {
	size: 100,
	blacklist: [],
	maxCategories: 10,
	maxItems: 4
};

// context type
MultiLevelMenu.contextTypes = {
	appbaseRef: _react2.default.PropTypes.any.isRequired,
	type: _react2.default.PropTypes.any.isRequired
};

MultiLevelMenu.types = {
	componentId: _reactivebase.TYPES.STRING,
	appbaseField: _reactivebase.TYPES.ARRAY,
	react: _reactivebase.TYPES.OBJECT,
	size: _reactivebase.TYPES.NUMBER,
	maxCategories: _reactivebase.TYPES.NUMBER,
	maxItems: _reactivebase.TYPES.NUMBER,
	blacklist: _reactivebase.TYPES.ARRAY,
	data: _reactivebase.TYPES.OBJECT,
	customQuery: _reactivebase.TYPES.FUNCTION,
	initialLoader: _reactivebase.TYPES.OBJECT
};