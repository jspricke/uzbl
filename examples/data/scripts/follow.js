/* This is the basic linkfollowing script.
 * Its pretty stable, and you configure which keys to use for hinting
 *
 * TODO: Some pages mess around a lot with the zIndex which
 * lets some hints in the background.
 * TODO: Some positions are not calculated correctly (mostly
 * because of uber-fancy-designed-webpages. Basic HTML and CSS
 * works good
 * TODO: Still some links can't be followed/unexpected things
 * happen. Blame some freaky webdesigners ;)
 */

//Just some shortcuts and globals
var uzblid = 'uzbl_link_hint';
var uzbldivid = uzblid + '_div_container';
var doc = document;
var win = window;
var links = document.links;
var forms = document.forms;
//Make onlick-links "clickable"
try {
    HTMLElement.prototype.click = function() {
        if (typeof this.onclick == 'function') {
            this.onclick({
                type: 'click'
            });
        }
    };
} catch(e) {}
//Catch the ESC keypress to stop linkfollowing
function keyPressHandler(e) {
    var kC = window.event ? event.keyCode: e.keyCode;
    var Esc = window.event ? 27 : e.DOM_VK_ESCAPE;
    if (kC == Esc) {
        removeAllHints();
    }
}
//Calculate element position to draw the hint
//Pretty accurate but on fails in some very fancy cases
function elementPosition(el) {
    var up = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    while (el.offsetParent) {
        el = el.offsetParent;
        up += el.offsetTop;
        left += el.offsetLeft;
    }
    return [up, left, width, height];
}
//Calculate if an element is visible
function isVisible(el) {
    if (el == doc) {
        return true;
    }
    if (!el) {
        return false;
    }
    if (!el.parentNode) {
        return false;
    }
    if (el.style) {
        if (el.style.display == 'none') {
            return false;
        }
        if (el.style.visibility == 'hidden') {
            return false;
        }
    }
    return isVisible(el.parentNode);
}
//Calculate if an element is on the viewport.
function elementInViewport(el) {
    offset = elementPosition(el);
    var up = offset[0];
    var left = offset[1];
    var width = offset[2];
    var height = offset[3];
    return up < window.pageYOffset + window.innerHeight && left < window.pageXOffset + window.innerWidth && (up + height) > window.pageYOffset && (left + width) > window.pageXOffset;
}
//Removes all hints/leftovers that might be generated
//by this script.
function removeAllHints() {
    var elements = doc.getElementById(uzbldivid);
    if (elements) {
        elements.parentNode.removeChild(elements);
    }
}
//Generate a hint for an element with the given label
//Here you can play around with the style of the hints!
function generateHint(el, label) {
    var pos = elementPosition(el);
    var hint = doc.createElement('div');
    hint.setAttribute('name', uzblid);
    hint.innerText = label;
    hint.style.display = 'inline';
    hint.style.backgroundColor = '#B9FF00';
    hint.style.border = '2px solid #4A6600';
    hint.style.color = 'black';
    hint.style.fontSize = '9px';
    hint.style.fontWeight = 'bold';
    hint.style.lineHeight = '9px';
    hint.style.margin = '0px';
    hint.style.width = 'auto'; // fix broken rendering on w3schools.com
    hint.style.padding = '1px';
    hint.style.position = 'absolute';
    hint.style.zIndex = '1000';
    // hint.style.textTransform = 'uppercase';
    hint.style.left = pos[1] + 'px';
    hint.style.top = pos[0] + 'px';
    // var img = el.getElementsByTagName('img');
    // if (img.length > 0) {
    //     hint.style.top = pos[1] + img[0].height / 2 - 6 + 'px';
    // }
    hint.style.textDecoration = 'none';
    // hint.style.webkitBorderRadius = '6px'; // slow
    // Play around with this, pretty funny things to do :)
    // hint.style.webkitTransform = 'scale(1) rotate(0deg) translate(-6px,-5px)';
    return hint;
}

// Here we choose what to do with an element that the user has selected.
// Form elements get selected and/or focussed, and links and buttons are
// clicked. This function returns "XXXRESET_MODEXXX" to indicate that uzbl
// should be reset to command mode with an empty keycmd, or
// "XXX_EMIT_FORM_ACTIVEXXX" to indicate that uzbl should be set to insert mode.
function clickElem(item) {
    removeAllHints();
    if (item) {
        var name = item.tagName;
        if (name == 'BUTTON') {
            item.click();
            return "XXXRESET_MODEXXX";
        } else if (name == 'INPUT') {
            var type = item.type.toUpperCase();
            if (type == 'TEXT' || type == 'SEARCH' || type == 'PASSWORD') {
                item.focus();
                item.select();
                return "XXXEMIT_FORM_ACTIVEXXX";
            } else {
                item.click();
                return "XXXRESET_MODEXXX";
            }
        } else if (name == 'TEXTAREA' || name == 'SELECT') {
            item.focus();
            item.select();
            return "XXXEMIT_FORM_ACTIVEXXX";
        } else {
            item.click();
            window.location = item.href;
            return "XXXRESET_MODEXXX";
        }
    }
}
//Returns a list of all links (in this version
//just the elements itself, but in other versions, we
//add the label here.
function addLinks() {
    res = [[], []];
    for (var l = 0; l < links.length; l++) {
        var li = links[l];
        if (isVisible(li) && elementInViewport(li)) {
            res[0].push(li);
            res[1].push(li.innerText.toLowerCase());
        }
    }
    return res;
}
//Same as above, just for the form elements
function addFormElems() {
    res = [[], []];
    for (var f = 0; f < forms.length; f++) {
        for (var e = 0; e < forms[f].elements.length; e++) {
            var el = forms[f].elements[e];
            if (el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].indexOf(el.tagName) + 1 && isVisible(el) && elementInViewport(el)) {
                res[0].push(el);
                if (el.getAttribute('value')) {
                    res[1].push(el.getAttribute('value').toLowerCase());
                } else {
                    res[1].push(el.getAttribute('name').toLowerCase());
                }
            }
        }
    }
    return res;
}
//Draw all hints for all elements passed. "len" is for
//the number of chars we should use to avoid collisions
function reDrawHints(elems) {
    removeAllHints();
    var llen = ((elems[0].length - 1) + '').length;
    var hintdiv = doc.createElement('div');
    hintdiv.setAttribute('id', uzbldivid);
    for (var i = 0; i < elems[0].length; i++) {
        var label = i + '';
        var n = label.length;
        for (n; n < llen; n++) {
            label = '0' + label;
        }
        if (elems[0][i]) {
            var h = generateHint(elems[0][i], label);
            hintdiv.appendChild(h);
        }
    }
    if (document.body) {
        document.body.appendChild(hintdiv);
    }
}
//Put it all together
function followLinks(follow) {
    if (document.body) document.body.setAttribute('onkeyup', 'keyPressHandler(event)');
    var linkelems = addLinks();
    var formelems = addFormElems();
    var elems = [linkelems[0].concat(formelems[0]), linkelems[1].concat(formelems[1])];
    var leftover = [[], []];

    var numInd = follow.search('[0-9]+$');
    if(numInd != -1) {
        var text = follow.substring(0, numInd);
        var nlen = follow.length - numInd;
        var num = parseInt(follow.substring(numInd), 10);
    } else {
        var text = follow;
        var num = -1;
    }

    for (var j = 0; j < elems[0].length; j++) {
        if (elems[1][j].search(text) != -1 || elems[1][j].search(follow) != -1) {
            leftover[0].push(elems[0][j]);
            leftover[1].push(elems[1][j]);
        }
    }

    var llen = (leftover[0].length + '').length;
    if(num > -1 && llen == nlen && num < leftover[0].length) {
        return clickElem(leftover[0][num]);
    } else {
        if(num > -1 && leftover[0].length > 10 && num * 10 < leftover[0].length) {
            if((num + 1) * 10 > leftover[0].length) {
                leftover[0] = leftover[0].slice(num * 10, leftover[0].length);
                leftover[1] = leftover[1].slice(num * 10, leftover[1].length);
            } else {
                leftover[0] = leftover[0].slice(num * 10,  (num + 1) * 10);
                leftover[1] = leftover[1].slice(num * 10,  (num + 1) * 10);
            }
        }
        var allEq = true;
        for(var i = 1; i < leftover[0].length; i++) {
          if(leftover[0][0].href != leftover[0][i].href) {
            allEq = false;
            break;
          }
        }
        if(allEq) {
            return clickElem(leftover[0][0]);
        } else {
            reDrawHints(leftover);
        }
    }
}

//Parse input: first argument is follow keys, second is user input.
var args = '%s'.split(' ');
followLinks(args[1]);
