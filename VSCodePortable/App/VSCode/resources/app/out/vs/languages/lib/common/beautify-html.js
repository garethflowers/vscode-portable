/*!--------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
define("vs/languages/lib/common/beautify",["require","exports"],function(t,e){function n(t,e){return t}e.js_beautify=n}),/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline
        newline_between_rules (true)      - add a new line after every css rule

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
      'newline_between_rules': true
    });
*/
function(){function t(e,n){function i(){return y=e.charAt(++m),y||""}function s(t){var n="",s=m;return t&&h(),n=e.charAt(m+1)||"",m=s-1,i(),n}function r(t){for(var n=m;i();)if("\\"===y)i();else{if(-1!==t.indexOf(y))break;if("\n"===y)break}return e.substring(n,m+1)}function a(t){var e=m,n=r(t);return m=e-1,i(),n}function h(){for(var t="";T.test(s());)i(),t+=y;return t}function o(){var t="";for(y&&T.test(y)&&(t=y);T.test(i());)t+=y;return t}function _(t){var n=m;for(t="/"===s(),i();i();){if(!t&&"*"===y&&"/"===s()){i();break}if(t&&"\n"===y)return e.substring(n,m)}return e.substring(n,m)+y}function u(t){return e.substring(m-t.length,m).toLowerCase()===t}function p(){for(var t=0,n=m+1;n<e.length;n++){var i=e.charAt(n);if("{"===i)return!0;if("("===i)t+=1;else if(")"===i){if(0==t)return!1;t-=1}else if(";"===i||"}"===i)return!1}return!1}function c(){S++,x+=A}function l(){S--,x=x.slice(0,-f)}n=n||{},e=e||"",e=e.replace(/\r\n|[\r\u2028\u2029]/g,"\n");var f=n.indent_size||4,g=n.indent_char||" ",d=void 0===n.selector_separator_newline?!0:n.selector_separator_newline,w=void 0===n.end_with_newline?!1:n.end_with_newline,v=void 0===n.newline_between_rules?!0:n.newline_between_rules,b=n.eol?n.eol:"\n";"string"==typeof f&&(f=parseInt(f,10)),n.indent_with_tabs&&(g="	",f=1),b=b.replace(/\\r/,"\r").replace(/\\n/,"\n");var y,T=/^\s+$/,m=-1,k=0,x=e.match(/^[\t ]*/)[0],A=new Array(f+1).join(g),S=0,E=0,L={};L["{"]=function(t){L.singleSpace(),N.push(t),L.newLine()},L["}"]=function(t){L.newLine(),N.push(t),L.newLine()},L._lastCharWhitespace=function(){return T.test(N[N.length-1])},L.newLine=function(t){N.length&&(t||"\n"===N[N.length-1]||L.trim(),N.push("\n"),x&&N.push(x))},L.singleSpace=function(){N.length&&!L._lastCharWhitespace()&&N.push(" ")},L.preserveSingleSpace=function(){j&&L.singleSpace()},L.trim=function(){for(;L._lastCharWhitespace();)N.pop()};for(var N=[],O=!1,C=!1,U=!1,I="",K="";;){var G=o(),j=""!==G,R=-1!==G.indexOf("\n");if(K=I,I=y,!y)break;if("/"===y&&"*"===s()){var D=0===S;(R||D)&&L.newLine(),N.push(_()),L.newLine(),D&&L.newLine(!0)}else if("/"===y&&"/"===s())R||"{"===K||L.trim(),L.singleSpace(),N.push(_()),L.newLine();else if("@"===y){L.preserveSingleSpace(),N.push(y);var $=a(": ,;{}()[]/='\"");$.match(/[ :]$/)&&(i(),$=r(": ").replace(/\s$/,""),N.push($),L.singleSpace()),$=$.replace(/\s$/,""),$ in t.NESTED_AT_RULE&&(E+=1,$ in t.CONDITIONAL_GROUP_RULE&&(U=!0))}else"#"===y&&"{"===s()?(L.preserveSingleSpace(),N.push(r("}"))):"{"===y?"}"===s(!0)?(h(),i(),L.singleSpace(),N.push("{}"),L.newLine(),v&&0===S&&L.newLine(!0)):(c(),L["{"](y),U?(U=!1,O=S>E):O=S>=E):"}"===y?(l(),L["}"](y),O=!1,C=!1,E&&E--,v&&0===S&&L.newLine(!0)):":"===y?(h(),!O&&!U||u("&")||p()?":"===s()?(i(),N.push("::")):N.push(":"):(C=!0,N.push(":"),L.singleSpace())):'"'===y||"'"===y?(L.preserveSingleSpace(),N.push(r(y))):";"===y?(C=!1,N.push(y),L.newLine()):"("===y?u("url")?(N.push(y),h(),i()&&(")"!==y&&'"'!==y&&"'"!==y?N.push(r(")")):m--)):(k++,L.preserveSingleSpace(),N.push(y),h()):")"===y?(N.push(y),k--):","===y?(N.push(y),h(),d&&!C&&1>k?L.newLine():L.singleSpace()):"]"===y?N.push(y):"["===y?(L.preserveSingleSpace(),N.push(y)):"="===y?(h(),y="=",N.push(y)):(L.preserveSingleSpace(),N.push(y))}var z="";return x&&(z+=x),z+=N.join("").replace(/[\r\n\t ]+$/,""),w&&(z+="\n"),"\n"!=b&&(z=z.replace(/[\n]/g,b)),z}t.NESTED_AT_RULE={"@page":!0,"@font-face":!0,"@keyframes":!0,"@media":!0,"@supports":!0,"@document":!0},t.CONDITIONAL_GROUP_RULE={"@media":!0,"@supports":!0,"@document":!0},"function"==typeof define&&define.amd?define("vs/languages/lib/common/beautify-css",[],function(){return{css_beautify:t}}):"undefined"!=typeof exports?exports.css_beautify=t:"undefined"!=typeof window?window.css_beautify=t:"undefined"!=typeof global&&(global.css_beautify=t)}(),/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
    http://jsbeautifier.org/

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_inner_html (default false)  — indent <head> and <body> sections,
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    wrap_line_length (default 250)            -  maximum amount of characters per line (0 = disable)
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"
    preserve_newlines (default true) - whether existing line breaks before elements should be preserved
                                        Only works before elements, not inside tags or for text.
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk
    indent_handlebars (default false) - format and indent {{#foo}} and {{/foo}}
    end_with_newline (false)          - end with a newline
    extra_liners (default [head,body,/html]) -List of tags that should have an extra newline before them.

    e.g.

    style_html(html_source, {
      'indent_inner_html': false,
      'indent_size': 2,
      'indent_char': ' ',
      'wrap_line_length': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u'],
      'preserve_newlines': true,
      'max_preserve_newlines': 5,
      'indent_handlebars': false,
      'extra_liners': ['/html']
    });
*/
function(){function t(t){return t.replace(/^\s+/g,"")}function e(t){return t.replace(/\s+$/g,"")}function n(n,i,s,r){function a(){return this.pos=0,this.token="",this.current_mode="CONTENT",this.tags={parent:"parent1",parentcount:1,parent1:""},this.tag_type="",this.token_text=this.last_token=this.last_text=this.token_type="",this.newlines=0,this.indent_content=o,this.Utils={whitespace:"\n\r	 ".split(""),single_token:"br,input,link,meta,source,!doctype,basefont,base,area,hr,wbr,param,img,isindex,embed".split(","),extra_liners:y,in_array:function(t,e){for(var n=0;n<e.length;n++)if(t===e[n])return!0;return!1}},this.is_whitespace=function(t){for(var e=0;e<t.length;t++)if(!this.Utils.in_array(t.charAt(e),this.Utils.whitespace))return!1;return!0},this.traverse_whitespace=function(){var t="";if(t=this.input.charAt(this.pos),this.Utils.in_array(t,this.Utils.whitespace)){for(this.newlines=0;this.Utils.in_array(t,this.Utils.whitespace);)f&&"\n"===t&&this.newlines<=g&&(this.newlines+=1),this.pos++,t=this.input.charAt(this.pos);return!0}return!1},this.space_or_wrap=function(t){this.line_char_count>=this.wrap_line_length?(this.print_newline(!1,t),this.print_indentation(t)):(this.line_char_count++,t.push(" "))},this.get_content=function(){for(var t="",e=[];"<"!==this.input.charAt(this.pos);){if(this.pos>=this.input.length)return e.length?e.join(""):["","TK_EOF"];if(this.traverse_whitespace())this.space_or_wrap(e);else{if(d){var n=this.input.substr(this.pos,3);if("{{#"===n||"{{/"===n)break;if("{{!"===n)return[this.get_tag(),"TK_TAG_HANDLEBARS_COMMENT"];if("{{"===this.input.substr(this.pos,2)&&"{{else}}"===this.get_tag(!0))break}t=this.input.charAt(this.pos),this.pos++,this.line_char_count++,e.push(t)}}return e.length?e.join(""):""},this.get_contents_to=function(t){if(this.pos===this.input.length)return["","TK_EOF"];var e="",n=new RegExp("</"+t+"\\s*>","igm");n.lastIndex=this.pos;var i=n.exec(this.input),s=i?i.index:this.input.length;return this.pos<s&&(e=this.input.substring(this.pos,s),this.pos=s),e},this.record_tag=function(t){this.tags[t+"count"]?(this.tags[t+"count"]++,this.tags[t+this.tags[t+"count"]]=this.indent_level):(this.tags[t+"count"]=1,this.tags[t+this.tags[t+"count"]]=this.indent_level),this.tags[t+this.tags[t+"count"]+"parent"]=this.tags.parent,this.tags.parent=t+this.tags[t+"count"]},this.retrieve_tag=function(t){if(this.tags[t+"count"]){for(var e=this.tags.parent;e&&t+this.tags[t+"count"]!==e;)e=this.tags[e+"parent"];e&&(this.indent_level=this.tags[t+this.tags[t+"count"]],this.tags.parent=this.tags[e+"parent"]),delete this.tags[t+this.tags[t+"count"]+"parent"],delete this.tags[t+this.tags[t+"count"]],1===this.tags[t+"count"]?delete this.tags[t+"count"]:this.tags[t+"count"]--}},this.indent_to_tag=function(t){if(this.tags[t+"count"]){for(var e=this.tags.parent;e&&t+this.tags[t+"count"]!==e;)e=this.tags[e+"parent"];e&&(this.indent_level=this.tags[t+this.tags[t+"count"]])}},this.get_tag=function(t){var e,n,i,s="",r=[],a="",h=!1,o=!0,_=this.pos,p=this.line_char_count;t=void 0!==t?t:!1;do{if(this.pos>=this.input.length)return t&&(this.pos=_,this.line_char_count=p),r.length?r.join(""):["","TK_EOF"];if(s=this.input.charAt(this.pos),this.pos++,this.Utils.in_array(s,this.Utils.whitespace))h=!0;else{if(("'"===s||'"'===s)&&(s+=this.get_unformatted(s),h=!0),"="===s&&(h=!1),r.length&&"="!==r[r.length-1]&&">"!==s&&h){if(this.space_or_wrap(r),h=!1,!o&&"force"===w&&"/"!==s){this.print_newline(!0,r),this.print_indentation(r);for(var c=0;v>c;c++)r.push(u)}for(var f=0;f<r.length;f++)if(" "===r[f]){o=!1;break}}if(d&&"<"===i&&s+this.input.charAt(this.pos)==="{{"&&(s+=this.get_unformatted("}}"),r.length&&" "!==r[r.length-1]&&"<"!==r[r.length-1]&&(s=" "+s),h=!0),"<"!==s||i||(e=this.pos-1,i="<"),d&&!i&&r.length>=2&&"{"===r[r.length-1]&&"{"===r[r.length-2]&&(e="#"===s||"/"===s||"!"===s?this.pos-3:this.pos-2,i="{"),this.line_char_count++,r.push(s),r[1]&&("!"===r[1]||"?"===r[1]||"%"===r[1])){r=[this.get_comment(e)];break}if(d&&r[1]&&"{"===r[1]&&r[2]&&"!"===r[2]){r=[this.get_comment(e)];break}if(d&&"{"===i&&r.length>2&&"}"===r[r.length-2]&&"}"===r[r.length-1])break}}while(">"!==s);var g,b,y=r.join("");g=-1!==y.indexOf(" ")?y.indexOf(" "):"{"===y.charAt(0)?y.indexOf("}"):y.indexOf(">"),b="<"!==y.charAt(0)&&d?"#"===y.charAt(2)?3:2:1;var T=y.substring(b,g).toLowerCase();return"/"===y.charAt(y.length-2)||this.Utils.in_array(T,this.Utils.single_token)?t||(this.tag_type="SINGLE"):d&&"{"===y.charAt(0)&&"else"===T?t||(this.indent_to_tag("if"),this.tag_type="HANDLEBARS_ELSE",this.indent_content=!0,this.traverse_whitespace()):this.is_unformatted(T,l)?(a=this.get_unformatted("</"+T+">",y),r.push(a),n=this.pos-1,this.tag_type="SINGLE"):"script"===T&&(-1===y.search("type")||y.search("type")>-1&&y.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/)>-1)?t||(this.record_tag(T),this.tag_type="SCRIPT"):"style"===T&&(-1===y.search("type")||y.search("type")>-1&&y.search("text/css")>-1)?t||(this.record_tag(T),this.tag_type="STYLE"):"!"===T.charAt(0)?t||(this.tag_type="SINGLE",this.traverse_whitespace()):t||("/"===T.charAt(0)?(this.retrieve_tag(T.substring(1)),this.tag_type="END"):(this.record_tag(T),"html"!==T.toLowerCase()&&(this.indent_content=!0),this.tag_type="START"),this.traverse_whitespace()&&this.space_or_wrap(r),this.Utils.in_array(T,this.Utils.extra_liners)&&(this.print_newline(!1,this.output),this.output.length&&"\n"!==this.output[this.output.length-2]&&this.print_newline(!0,this.output))),t&&(this.pos=_,this.line_char_count=p),r.join("")},this.get_comment=function(t){var e="",n=">",i=!1;for(this.pos=t,input_char=this.input.charAt(this.pos),this.pos++;this.pos<=this.input.length&&(e+=input_char,e.charAt(e.length-1)!==n.charAt(n.length-1)||-1===e.indexOf(n));)!i&&e.length<10&&(0===e.indexOf("<![if")?(n="<![endif]>",i=!0):0===e.indexOf("<![cdata[")?(n="]]>",i=!0):0===e.indexOf("<![")?(n="]>",i=!0):0===e.indexOf("<!--")?(n="-->",i=!0):0===e.indexOf("{{!")?(n="}}",i=!0):0===e.indexOf("<?")?(n="?>",i=!0):0===e.indexOf("<%")&&(n="%>",i=!0)),input_char=this.input.charAt(this.pos),this.pos++;return e},this.get_unformatted=function(t,e){if(e&&-1!==e.toLowerCase().indexOf(t))return"";var n="",i="",s=0,r=!0;do{if(this.pos>=this.input.length)return i;if(n=this.input.charAt(this.pos),this.pos++,this.Utils.in_array(n,this.Utils.whitespace)){if(!r){this.line_char_count--;continue}if("\n"===n||"\r"===n){i+="\n",this.line_char_count=0;continue}}i+=n,this.line_char_count++,r=!0,d&&"{"===n&&i.length&&"{"===i.charAt(i.length-2)&&(i+=this.get_unformatted("}}"),s=i.length)}while(-1===i.toLowerCase().indexOf(t,s));return i},this.get_token=function(){var t;if("TK_TAG_SCRIPT"===this.last_token||"TK_TAG_STYLE"===this.last_token){var e=this.last_token.substr(7);return t=this.get_contents_to(e),"string"!=typeof t?t:[t,"TK_"+e]}if("CONTENT"===this.current_mode)return t=this.get_content(),"string"!=typeof t?t:[t,"TK_CONTENT"];if("TAG"===this.current_mode){if(t=this.get_tag(),"string"!=typeof t)return t;var n="TK_TAG_"+this.tag_type;return[t,n]}},this.get_full_indent=function(t){return t=this.indent_level+t||0,1>t?"":Array(t+1).join(this.indent_string)},this.is_unformatted=function(t,e){if(!this.Utils.in_array(t,e))return!1;if("a"!==t.toLowerCase()||!this.Utils.in_array("a",e))return!0;var n=this.get_tag(!0),i=(n||"").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);return!i||this.Utils.in_array(i,e)?!0:!1},this.printer=function(n,i,s,r,a){this.input=n||"",this.input=this.input.replace(/\r\n|[\r\u2028\u2029]/g,"\n"),this.output=[],this.indent_character=i,this.indent_string="",this.indent_size=s,this.brace_style=a,this.indent_level=0,this.wrap_line_length=r,this.line_char_count=0;for(var h=0;h<this.indent_size;h++)this.indent_string+=this.indent_character;this.print_newline=function(t,n){this.line_char_count=0,n&&n.length&&(t||"\n"!==n[n.length-1])&&("\n"!==n[n.length-1]&&(n[n.length-1]=e(n[n.length-1])),n.push("\n"))},this.print_indentation=function(t){for(var e=0;e<this.indent_level;e++)t.push(this.indent_string),this.line_char_count+=this.indent_string.length},this.print_token=function(e){(!this.is_whitespace(e)||this.output.length)&&((e||""!==e)&&this.output.length&&"\n"===this.output[this.output.length-1]&&(this.print_indentation(this.output),e=t(e)),this.print_token_raw(e))},this.print_token_raw=function(t){this.newlines>0&&(t=e(t)),t&&""!==t&&(t.length>1&&"\n"===t.charAt(t.length-1)?(this.output.push(t.slice(0,-1)),this.print_newline(!1,this.output)):this.output.push(t));for(var n=0;n<this.newlines;n++)this.print_newline(n>0,this.output);this.newlines=0},this.indent=function(){this.indent_level++},this.unindent=function(){this.indent_level>0&&this.indent_level--}},this}var h,o,_,u,p,c,l,f,g,d,w,v,b,y,T;for(i=i||{},void 0!==i.wrap_line_length&&0!==parseInt(i.wrap_line_length,10)||void 0===i.max_char||0===parseInt(i.max_char,10)||(i.wrap_line_length=i.max_char),o=void 0===i.indent_inner_html?!1:i.indent_inner_html,_=void 0===i.indent_size?4:parseInt(i.indent_size,10),u=void 0===i.indent_char?" ":i.indent_char,c=void 0===i.brace_style?"collapse":i.brace_style,p=0===parseInt(i.wrap_line_length,10)?32786:parseInt(i.wrap_line_length||250,10),l=i.unformatted||["a","span","img","bdo","em","strong","dfn","code","samp","kbd","var","cite","abbr","acronym","q","sub","sup","tt","i","b","big","small","u","s","strike","font","ins","del","pre","address","dt","h1","h2","h3","h4","h5","h6"],f=void 0===i.preserve_newlines?!0:i.preserve_newlines,g=f?isNaN(parseInt(i.max_preserve_newlines,10))?32786:parseInt(i.max_preserve_newlines,10):0,d=void 0===i.indent_handlebars?!1:i.indent_handlebars,w=void 0===i.wrap_attributes?"auto":i.wrap_attributes,v=void 0===i.wrap_attributes_indent_size?_:parseInt(i.wrap_attributes_indent_size,10)||_,b=void 0===i.end_with_newline?!1:i.end_with_newline,y="object"==typeof i.extra_liners&&i.extra_liners?i.extra_liners.concat():"string"==typeof i.extra_liners?i.extra_liners.split(","):"head,body,/html".split(","),T=i.eol?i.eol:"\n",i.indent_with_tabs&&(u="	",_=1),T=T.replace(/\\r/,"\r").replace(/\\n/,"\n"),h=new a,h.printer(n,u,_,p,c);;){var m=h.get_token();if(h.token_text=m[0],h.token_type=m[1],"TK_EOF"===h.token_type)break;switch(h.token_type){case"TK_TAG_START":h.print_newline(!1,h.output),h.print_token(h.token_text),h.indent_content&&(h.indent(),h.indent_content=!1),h.current_mode="CONTENT";break;case"TK_TAG_STYLE":case"TK_TAG_SCRIPT":h.print_newline(!1,h.output),h.print_token(h.token_text),h.current_mode="CONTENT";break;case"TK_TAG_END":if("TK_CONTENT"===h.last_token&&""===h.last_text){var k=h.token_text.match(/\w+/)[0],x=null;h.output.length&&(x=h.output[h.output.length-1].match(/(?:<|{{#)\s*(\w+)/)),(null===x||x[1]!==k&&!h.Utils.in_array(x[1],l))&&h.print_newline(!1,h.output)}h.print_token(h.token_text),h.current_mode="CONTENT";break;case"TK_TAG_SINGLE":var A=h.token_text.match(/^\s*<([a-z-]+)/i);A&&h.Utils.in_array(A[1],l)||h.print_newline(!1,h.output),h.print_token(h.token_text),h.current_mode="CONTENT";break;case"TK_TAG_HANDLEBARS_ELSE":h.print_token(h.token_text),h.indent_content&&(h.indent(),h.indent_content=!1),h.current_mode="CONTENT";break;case"TK_TAG_HANDLEBARS_COMMENT":h.print_token(h.token_text),h.current_mode="TAG";break;case"TK_CONTENT":h.print_token(h.token_text),h.current_mode="TAG";break;case"TK_STYLE":case"TK_SCRIPT":if(""!==h.token_text){h.print_newline(!1,h.output);var S,E=h.token_text,L=1;"TK_SCRIPT"===h.token_type?S="function"==typeof s&&s:"TK_STYLE"===h.token_type&&(S="function"==typeof r&&r),"keep"===i.indent_scripts?L=0:"separate"===i.indent_scripts&&(L=-h.indent_level);var N=h.get_full_indent(L);if(S){var O=function(){this.eol="\n"};O.prototype=i;var C=new O;E=S(E.replace(/^\s*/,N),C)}else{var U=E.match(/^\s*/)[0],I=U.match(/[^\n\r]*$/)[0].split(h.indent_string).length-1,K=h.get_full_indent(L-I);E=E.replace(/^\s*/,N).replace(/\r\n|\r|\n/g,"\n"+K).replace(/\s+$/,"")}E&&(h.print_token_raw(E),h.print_newline(!0,h.output))}h.current_mode="TAG";break;default:""!==h.token_text&&h.print_token(h.token_text)}h.last_token=h.token_type,h.last_text=h.token_text}var G=h.output.join("").replace(/[\r\n\t ]+$/,"");return b&&(G+="\n"),"\n"!=T&&(G=G.replace(/[\n]/g,T)),G}if("function"==typeof define&&define.amd)define("vs/languages/lib/common/beautify-html",["require","./beautify","./beautify-css"],function(t){var e=t("./beautify"),i=t("./beautify-css");return{html_beautify:function(t,s){return n(t,s,e.js_beautify,i.css_beautify)}}});else if("undefined"!=typeof exports){var i=require("./beautify.js"),s=require("./beautify-css.js");exports.html_beautify=function(t,e){return n(t,e,i.js_beautify,s.css_beautify)}}else"undefined"!=typeof window?window.html_beautify=function(t,e){return n(t,e,window.js_beautify,window.css_beautify)}:"undefined"!=typeof global&&(global.html_beautify=function(t,e){return n(t,e,global.js_beautify,global.css_beautify)})}();