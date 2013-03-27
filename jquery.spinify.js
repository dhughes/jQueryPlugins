(function($) {

	var field;

	var methods = {
		init: function(options) {

			return this.each(function() {
				var $this = $(this);


				$this.bind('click.spinify', methods.spin);
			});
		},

		spin: function() {
			var button = $(this);
			console.log(button.html());
			var offset = button.offset();

			var spinner = $("<div class='spinner'>&nbsp;</div>");
			spinner.css("position", "absolute");
			spinner.css("left", offset.left);
			spinner.css("top", offset.top);
			spinner.css("width", button.innerWidth());
			spinner.css("height", button.innerHeight());

			$(document.body).append(spinner);
		},

		off: function() {
			$(".spinner").remove()
		}
	}

	$.fn.spinify = function(method) {

		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || ! method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.spinify');
		}

	};
})(jQuery);
