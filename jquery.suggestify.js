/**
 * Suggest created by Doug Hughes
 *
 * Depends on:
 *	jquery.caret.1.02.js - http://www.jquery-plugin.buss.hk/my-plugins/jquery-caret-plugin
 *	json2.js - https://github.com/douglascrockford/JSON-js
 *	 jquery.allcss.js - n/a yet
 *
 */

(function($) {

	var field;

	var methods = {
		init: function(options) {
			var settings = {
				suggestionList: null,
				timer: null,
				thisRef: null
			};

			$.extend(settings, options);

			this.data('suggestify', settings);

			return this.each(function() {
				$this = $(this);

				$this.bind('keydown.suggestify', methods.checkKey);
				$this.bind('keyup.suggestify', methods.keydown);
			});
		},

		checkKey: function(event) {
			// this function prevents moving the cursor down when the suggestion list is open
			var data = $(this).data('suggestify');
			var suggestionList = data.suggestionList;

			if ((event.keyCode == 13 && suggestionList != null) || (event.keyCode == 40 && suggestionList != null) || (event.keyCode == 38 && suggestionList != null)) {
				//console.log('dont move the cursor!!');
				return false;
			}
		},

		keydown: function(event) {
			var $this = $(this);
			var data = $(this).data('suggestify');
			data.cursorPosition = $this.caret().start;
			data.thisRef = $this;
			if (data.request == undefined) {
				data.request = null;
			}

			var expressions = $this.data('suggestify').expressions;

			// get the suggestion list
			var suggestionList = data.suggestionList;

			var value = $this.val().substring(0, data.cursorPosition);
			var trailing = $this.val().substring(data.cursorPosition, $this.val().length);

			// loop over the expressions and see if any of them match
			// will only match the first found, others will be skipped
			for (var x = 0; x < expressions.length; x++) {
				data.expression = expressions[x];
				var expression = data.expression;

				//console.log("test: " + expression.regex);
				var result = expression.regex.exec(value);

				if (result != null) {
					//var addLineFeed = result[0].charCodeAt(0) == 10; // line feed
					//var addSpace = result[0][0] == " "; // space

					if (event.keyCode == 27 && suggestionList != null) {
						// escape was pressed, close the menu
						methods.closeSuggestionList($this);

					} else if (event.keyCode == 40 && suggestionList != null) {
						// the suggestion list has items in it and the down key was hit
						suggestionList.incrementSelection(1);

					} else if (event.keyCode == 38 && suggestionList != null) {
						// the suggestion list has items in it up key was hit
						suggestionList.incrementSelection(-1);

					} else if (event.keyCode == 13 && suggestionList != null && suggestionList.value() != "") {
						// the suggestion list has items in it and the enter key was hit and an item was selected in the suggestion list
						var newValue = suggestionList.value(); // this doesn't really exist yet.

						if (newValue.length) {
							// assuming the suggestion list actually has any items in it,
							// add the selected item into the field.

							$this.val(value.replace(expression.regex, methods.getPrepend(result, expression.appendAfterRegexGroup) + newValue) + trailing);
							methods.placeCursor($this, data, event.shiftKey);
						}

						// close the suggestion list
						methods.closeSuggestionList($this);
					} else {
						if (suggestionList != null) {
							suggestionList.deselect();
							methods.closeSuggestionList($this);
						}

						// first check to see if we need to request a specific set or not
						if (expression.setAjax) {
							// we didn't get an array of values so we need to request them
							// this is to try to control the number of requests we make

							// get the suggestions
							if (data.request != null) {
								data.request.abort();
							}
							data.request = $.get(expression.set, {data: JSON.stringify(result)}, function(suggestions) {
								// create a new suggestion list
								methods.closeSuggestionList($this);
								suggestionList = new methods.SuggestionList(suggestions, $this, data, methods.getPrepend(result, expression.appendAfterRegexGroup));
								suggestionList.show();
								data.suggestionList = suggestionList;
							});
						} else {
							// create a new suggestion list
							if (data.request != null) {
								data.request.abort();
							}
							methods.closeSuggestionList($this);
							suggestionList = new methods.SuggestionList(expression.set, $this, data, methods.getPrepend(result, expression.appendAfterRegexGroup));
							suggestionList.show();
							data.suggestionList = suggestionList;
						}

						// I may have a race condition here if this is used to both get the options
						// and set the selected option via ajax.

						// do we have anything telling us what's selected?
						if (expression.selectedAjax) {
							// make an ajax call to figure out what should be selected by default
							if (data.request != null) {
								data.request.abort();
							}
							data.request = $.get(expression.selected, {data: JSON.stringify(result)}, function(selected) {
								// create a new suggestion list
								try {
									data.suggestionList.value(selected);
								} catch(e) {
									console.log(e)
								}

							});
						} else {
							//console.log("manually select: " + expression.selected);
						}


					}

					return;
				}
			}

			// no expression was matched, close the suggestion list (if open)
			methods.closeSuggestionList($this);
		},

		getPrepend: function(result, appendAfterRegexGroup) {
			if (appendAfterRegexGroup) {
				var prepend = "";
				for (var i = 1; i <= appendAfterRegexGroup; i++) {
					prepend += result[i];
				}
				return prepend;
			} else {
				return "";
			}
		},

		closeSuggestionList: function($this) {
			if ($this != undefined) {
				var data = $this.data('suggestify');
			} else {
				var data = $(this).data('suggestify');
			}
			var suggestionList = data.suggestionList;

			if (suggestionList != null) {
				suggestionList.close();
			}
			;

			data.suggestionList = null;
		},

		placeCursor: function($this, data, addExtraChar) {
			var left = $this.val().substring(0, data.cursorPosition);
			var right = $this.val().substring(data.cursorPosition, $this.val().length);

			// find the next space or the end of the string in the right part.
			var index = right.search(/[\W]|$/);

			if (addExtraChar)
				index++;

			$this.caret(data.cursorPosition + index, data.cursorPosition + index);

			var left = $this.val().substring(0, data.cursorPosition + index);

			var textCalc = $("<span id='textCalc'>" + left + "</span>");
			$(document).append(textCalc);
			// this tells me how wide the string is.
			var width = textCalc.width() + 10 - $this.scrollLeft();

			if (width > $this.width()) {
				$this.scrollLeft($this.scrollLeft() + (width - $this.width()))
			}

			// remove that field!!
			textCalc.remove();
		},

		SuggestionList: function(suggestions, field, data, prepend) {
			this.suggestions = suggestions;
			this.field = field;
			this.data = data;
			this.regex = data.expression.regex;
			this.cursorPosition = data.cursorPosition;
			this.selectedIndex = -1;
			this.list = null;
			this.prepend = prepend;

			String.prototype.fracture = function() {
				// break this content down into user-provided lines (\n)
				var lines = this.split(/\n/g);

				// break each line into words denoted by spaces
				// some words may be a 0 length if there are multiple spaces in line
				for (var q = 0; q < lines.length; q++) {
					var line = lines[q];
					var words = [];

					var i = 0;
					while (i != -1) {
						i = line.search(/\s(\S|$)/);
						if (i != -1) {
							words.push(line.substr(0, i + 1).slice(0));
							line = line.substr(i + 1, line.length);
						}
					}

					// add the last word onto the array
					words.push(line);

					// update the lines array with the words array
					lines[q] = words;

				}

				return lines;
			};

			String.prototype.toNBSP = function() {
				var newString = this;

				if ($.browser.webkit) {
					// first, if this is webkit, chop of trailing spaces because they're ignored
					newString = newString.replace(/\s*?$/, "");
				}

				// now turn all remaining spaces into nbsp's and return that
				return newString.replace(/\s/g, "&nbsp;");
			}

			this.show = function() {
				this.list = null;
				left = this.field.val().substring(0, this.cursorPosition);

				var debug = 0;

				if (this.regex.exec(left) != null && this.suggestions.length) {
					// figure out where this thing needs to go
					var offset = this.field.offset();
					//var position = this.field.position();

					var top = offset.top - this.field.scrollTop();
					var left = offset.left;

					if ($.browser.mozilla) {
						left += 1;
					}

					this.cleanup();
					// create a temporary container that we can stick html elements into and run
					// some calculations on.
					var tempContainer = $("<div id='tempContainer'></div>");
					tempContainer.css(this.field.css());
					tempContainer.css("background-color", "transparent");
					tempContainer.css("color", "red");
					tempContainer.css("height", "auto");
					tempContainer.css("position", "absolute");
					tempContainer.css("left", left);
					tempContainer.css("top", top);

					$(document.body).append(tempContainer);

					//this is where the regex is matched

					// get the text to the left of the cursor
					var text = this.field.val().substr(0, this.cursorPosition).replace(/\t/g, "        ");
					;
					;
					var end = text.search(this.regex);

					// get only the part of the text to the left of our regular expression match (and replace tabs with non breaking spaces)
					// note that we're adding a line break and an * to prevent JS from stripping out a trailing new line character
					var remainder = text.substring(end, text.length);

					// get the with of the remainder
					var remainderWidth = this.getLineWidth(remainder);

					var temp = this.field.get(0);
					var maxWidth = 0;
					if (temp.scrollHeight > temp.clientHeight) {
						maxWidth = temp.scrollWidth;
					} else {
						maxWidth = this.field.innerWidth();
					}

					// this has just got to be fixed somehow.
					if ($.browser.mozilla) {
						maxWidth -= 0;
					} else if ($.browser.msie) {
						maxWidth -= 20;
					} else if ($.browser.webkit) {
						maxWidth -= 4;
					}

					// break this content down into an array of lines which are arrays of words
					var lines = text.fracture();

					// loop over each line and figure out where they soft wrap
					var newLine = 1;

					///console.log(lines);

					for (var q = 0; q < lines.length; q++) {
						var words = lines[q];

						var chunk = "";
						var chunkWordCount = 0;

						// loop over all the words on this line...
						for (var i = 0; i < words.length; i++) {
							if (!newLine) {
								chunk = chunk + words[i];
							} else {
								chunk = words[i];
								newLine = 0;
							}
							chunkWordCount++;

							//console.log(chunk);

							// is this line wider than the textarea?
							if (this.getLineWidth(chunk) > maxWidth) {

								// check to see how many words on on this line (note that it doesn't matter if the browser is opera, it doesn't wrap long lines.
								if (chunkWordCount == 1 && !$.browser.opera) {

									// we have a very long word and need to break the word somewhere in the middle

									// we need to go letter by letter over this chunk and when it's greater than maxWidth add another line to the content array in the lines array
									var subChunk = "";
									for (var x = 0; x < chunk.length; x++) {
										// create a new chunk of a part of this word
										subChunk += chunk[x]

										// is this wider than allowed?
										if (this.getLineWidth(subChunk) > maxWidth) {

											// go to the previous letter
											subChunk = subChunk.substr(0, subChunk.length - 1);

											// break this word

											// create a new line that's not too long
											this.addLine(subChunk);

											// update this element in the array
											words[i] = subChunk;

											// reset the new chunk
											subChunk = "";
											x--;
											break;
										}

									}

									// put the remainder of the word back into the chunk
									chunk = chunk.substr(x + 1, chunk.length - 1);
									words.splice(i + 1, 0, chunk);

									chunk = "";
									chunkWordCount = 0;
									newLine = 1;

								} else if (chunkWordCount == 1 && $.browser.opera) {
									// we have a long word in opera and don't need to break
									//console.log("opera chunk: *" + chunk + "*");
									this.addLine(chunk);

									chunk = "";
									chunkWordCount = 0;
									newLine = 1;
								} else {
									// we have a normal word and need to break before the word

									// remove the last word from the chunk
									//console.log("current chunk (too long): *" + chunk + "*");
									if (words[i].length) {
										chunk = chunk.substr(0, chunk.length - words[i].length);
									}
									//console.log("current chunk (less one word): *" + chunk + "*");

									i--;

									// create a new line that's not too long
									this.addLine(chunk);

									chunk = "";
									chunkWordCount = 0;
									newLine = 1;
								}

							} else if (i == words.length - 1) {
								// add the last line
								//console.log("last chunk: *" + chunk + "*");
								this.addLine(chunk);

								chunk = "";
								chunkWordCount = 0;
								newLine = 1;

							}
						}
					}

					var top = $("#tempContainer").offset().top + $("#tempContainer").innerHeight();
					var left = $("#tempContainer").offset().left + $(".textCalc2:last").innerWidth() - remainderWidth + this.getLineWidth(prepend);

					this.list = $("<ul id='suggestionsList' style='left: " + left + "px; top:" + top + "px;' />");

					// add elements to the list
					for (var i = 0; i < suggestions.length; i++) {
						this.list.append("<li>" + suggestions[i] + "</li>");
					}

					// add the list to the document
					$(document.body).append(this.list);

					if (!debug) {
						this.cleanup();
					}

				}

			};

			this.incrementSelection = function(i) {
				//console.log(this.selectedIndex);
				if (this.selectedIndex + i < 0) {
					this.selectedIndex = $("#suggestionsList li").length - 1;
				} else if (this.selectedIndex + i > $("#suggestionsList li").length - 1) {
					this.selectedIndex = 0;
				} else {
					this.selectedIndex = this.selectedIndex + i;
				}

				$("#suggestionsList li.selected").removeClass("selected");

				$($("#suggestionsList li").get(this.selectedIndex)).addClass("selected");
			}

			this.value = function(value) {
				if (value != null) {
					this.deselect();
					suggestionList = this;
					$("#suggestionsList li.selected").removeClass("selected");
					$("#suggestionsList li").each(function(i) {
						if ($(this).text() == value) {
							//console.log(i);
							suggestionList.selectedIndex = i;
							$(this).addClass("selected");
							return;
						}

					});
				} else {
					return $("#suggestionsList li.selected").text();
				}
			}

			this.getLineWidth = function(chunk) {
				var chunk = chunk.toNBSP();

				//console.log("get line width of: " + chunk);

				var line = $("<span class='textCalc'>" + chunk + "</span>");
				// temporarily append to the doc
				$("#tempContainer").append(line);

				//console.log("get line width of: " + chunk);

				var lineWidth = line.innerWidth();
				line.remove();

				return lineWidth;
			};

			this.addLine = function(chunk) {
				var chunk = chunk.toNBSP();
				$("#tempContainer").append("<span class='textCalc2'>" + chunk + "</span><br />");
			}

			this.cleanup = function() {
				$("#tempContainer").remove();
			}

			this.close = function() {
				// destroy the menu
				if (this.list != null) {
					this.list.remove();
				}
				this.cleanup();
				this.list = null;
			}

			this.deselect = function() {
				this.selectedIndex = -1;
			}

		}

	}

	$.fn.suggestify = function(method) {

		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || ! method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.suggestify');
		}

	};
})(jQuery);
