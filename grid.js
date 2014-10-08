(function($) {
	var Grid = function(element, options) {
		this.grid = $(element);
		this.rows = [];
		this.url = options.url;
		this.params = options.params;
		this.options = $.extend({}, $.fn.grid.defaults, options);
		$.extend(this, this.options);
		
		this.initContainer();
	};

	Grid.prototype = {
		constructor: Grid,

		initContainer: function() {
			var options = this.options;
			this.rowTemplate = this.grid.html();
			this.grid.data('events', {});
			
			this.clean();
			if (this.autoload) {
				this.load();
			}
		},

		createGridPanel: function() {
			var options = this.options;
			var width = options.width || '', height = options.height || '';
			var html = '<div id="gridPanel" style="overflow-y:auto; width:' + width + '; height: ' + height + ';"></div>';
			this.gridPanel = $(html);
			this.grid.append(this.gridPanel);
			return this.gridPanel;
		},
		
		createRows: function(records) {
			for (var i = 0, len = records.length; i < len; i++) {
				records[i].rowIndex = i + 1;
				this.rows.push(this.createRow(records[i]));
			}
			return this.rows;
		},
		
		createRow: function(record) {
			this.setData(record);
			if (this.beforeInsert) {
				this.beforeInsert(record);
			}
			var template = this.createRowTemplate ? this.createRowTemplate(record) : this.rowTemplate;
			var row = $($.util.fullProperty(template, record));
			
			row.data('data', record);
			row.css('cursor', 'pointer');
			row.bind('click', {record: record, grid: this}, this.onRowClick);
			row.bind('mouseover', {record: record, grid: this}, this.onMouseOver);
			row.bind('mouseout', {record: record, grid: this}, this.onMouseOut);
			row.bind('dblclick', {record: record, grid: this}, this.onRowDoubleClick);
			
			return row;
		},
		
		createPagination: function(pager) {
			var pn = pager.pageNo - 1, pt = pager.pageTotal, ps = pager.pageSize, pm = this.pageMax;
			var pe = Math.floor(pn / pm + 1) * pm;
			pe = (pt - pe < 0) ? pe - (pe - pt) : pe;
			var pb = pe - pm;
			pb = pb < 1 ? 0 : pb;
			
			if (pt === 0) 
				return;

			var self = this;
			self.params.pageNo = self.params.pageNo || 1;
			this.pagination = $('<div class="pagination pagination-centered"></div>');
			var ul = $('<ul></ul>');
			this.pagination.append(ul);
			
			var pres = $('<li class="' + (pn === 0 ? 'disabled' : '') + '"></li>');
			var btn = $('<a>&laquo;</a>').bind('click', function() {
				if (!$(this).parent().hasClass('disabled')) {
					var pn = self.params.pageNo;
					pn = pb;
					pn = pn < 0 ? 0 : pn;
					self.params.pageNo = pn;
					self.load();
				}
			});
			pres.append(btn);
			ul.append(pres);
			
			var pre = $('<li class="' + (pn === 0 ? 'disabled' : '') + '"></li>');
			btn = $('<a>&lsaquo;</a>').bind('click', function() {
				if (!$(this).parent().hasClass('disabled')) {
					self.params.pageNo--;
					self.load();
				}
			});
			pre.append(btn);
			ul.append(pre);
			
			for (var i = pb + 1; i <= pe; i++) {
				li = $('<li class="' + ((pn + 1) === i ? 'disabled' : '') + '"></li>');
				ul.append(li);
				a = $('<a>' + i + '</a>');
				a[0].pageNo = i;
				li.append(a);
				a.bind('click', function() {
					if (!$(this).parent().hasClass('disabled')) {
						self.params.pageNo = this.pageNo;
						self.load();
					}
				});
			}
			
			var next = $('<li class="' + ((pn + 1) === pt ? 'disabled' : '') + '"></li>');
			btn = $('<a>&rsaquo;</a>').bind('click', function() {
				if (!$(this).parent().hasClass('disabled')) {
					self.params.pageNo++;
					self.load();
				}
			});
			next.append(btn);
			ul.append(next);
			
			var nexts = $('<li class="' + ((pn + 1) === pt ? 'disabled' : '') + '"></li>');
			btn = $('<a>&raquo;</a>').bind('click', function() {
				if (!$(this).parent().hasClass('disabled')) {
					var pn = self.params.pageNo;
					pn = pe + 1;
					pn = pn > pt ? pt : pn;
					self.params.pageNo = pn;
					self.load();
				}
			});
			nexts.append(btn);
			ul.append(nexts);
			
			return this.pagination;
		},
		
		setRowData: function(i, record) {
			var row = this.rows[i];
			row.data('data', record);
			return row;
		},
		
		clean: function() {
			this.grid.children().remove();
			this.rows = [];
			
			if (this.paginationRender)
				$('#' + this.paginationRender).empty();
		},
		
		render: function(data) {
			if (data.root) {
				var rows = this.createRows(data.root);
				this.grid.append(rows);
				if (rows.length > 0) {
					var pagination = this.createPagination(data);
					if (pagination) {
						var pr = this.paginationRender;
						(pr ? $('#' + pr) : this.grid).append(pagination);
					}
				}
			} else {
				var rows = this.createRows(data);
				this.grid.append(rows);
			}
		},
		
		load: function(params, url) {
			var self = this;
			var options = self.options;
			var method = options.method;
			this.url = url || this.url;
			$.extend(this.params, params);
			
			if (self.beforeLoad) self.beforeLoad();
			
			self.grid.showLoading();
			
			$.ajax({
				type: method,
				url: this.url,
				dataType: 'json',
				timeout: this.options.timeout,
				data: this.params,
				success: function(msg) {
					self.clean();
					self.render(msg);
					if (self.afterLoad) self.afterLoad(msg);
					
					self.grid.hideLoading();
				},
				error: function(e) {
					if (self.loadFailure) self.loadFailure();
					
					self.grid.hideLoading();
		        }
			});
		},
		
		append: function(record) {
			record.rowIndex = this.rows.length + 1;
			var row = this.createRow(record);
			this.rows.push(row)
			this.grid.append(row);
		},
		
		remove: function(i) {
			this.indexOf(i).remove();
		},
		
		indexOf: function(i) {
			return this.rows[i];
		},
		
		getSelected: function() {
			return this.selected;
		},
		
		setData: function(record) {
			return record;
		},		
			
		onRowClick: function(e) {
			var grid = e.data.grid;
			grid.selected = e.data.record;
			
			if($(e.target).hasClass('disable-selected')) return;
			
			if (grid.isBind('selection'))
				grid.grid.trigger('selection', [e.data.record, grid, this]);
			
			if (grid.selectRow) {
				grid.selectRow.removeClass('row-selection');
			}
			var el = $(this);
			el.addClass('row-selection');
			grid.selectRow = el;
		},
		
		onRowDoubleClick: function(e) {
			var el = $(this), grid = e.data.grid;
			
			if (grid.isBind('doubleclick'))
				grid.grid.trigger('doubleclick', [e.data.record, grid, this]);
		},
		
		onMouseOver: function(e) {
			var el = $(this), grid = e.data.grid;
			el.toggleClass('row-hover');
			
			if (grid.isBind('mouseover'))
				grid.grid.trigger('mouseover', [grid, this]);
		},
		
		onMouseOut: function(e) {
			var el = $(this), grid = e.data.grid;
			el.toggleClass('row-hover');
			
			if (grid.isBind('mouseout'))
				grid.grid.trigger('mouseout', [grid, this]);
		},
		
		on: function(eventName, handler) {
			this.grid.bind(eventName, handler)
			this.grid.data('events')[eventName] = true;
		},
		
		isBind: function(eventName) {
			return this.grid.data('events')[eventName];
		}
	}
	
	$.fn.grid = function(option) {
		var methodReturn;
		
		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('grid');
			var options = typeof option === 'object' && option;
			options.params = options.params || {};
			if (!data) $this.data('grid', (data = new Grid(this, options)));
			if (typeof option === 'string') methodReturn = data[option]();
		});
		return (methodReturn === undefined) ? $set : methodReturn;
	};
	
	$.fn.grid.defaults = {
		autoload: false,
		pageMax: 10,
		params: {}
	};
	
	$.fn.grid.Constructor = Grid;
})($);