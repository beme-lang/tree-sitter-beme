/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Tree-sitter grammar for the beme language
// beme is a syntactic lens over Clojure — M-expression syntax with two rules:
//   Rule 1: f(x y) → (f x y)  — head outside the parens
//   Rule 2: f begin x y end   → (f x y)  — textual delimiters

export default grammar({
  name: "beme",

  extras: $ => [/[\s,]+/, $.comment],

  word: $ => $.symbol,

  conflicts: $ => [
    [$._callable, $._atom],
    [$._callable, $._form],
  ],

  rules: {
    source_file: $ => repeat($._form),

    // A form is any expression
    _form: $ => choice(
      $.call,
      $.begin_end_call,
      $._atom,
      $.vector,
      $.map,
      $.set,
      $.anonymous_function,
      $.quoted_list,
      $.quote,
      $.deref,
      $.var_quote,
      $.discard,
      $.metadata,
      $.tagged_literal,
      $.reader_conditional,
      $.namespaced_map,
      $.syntax_quote,
    ),

    // Rule 1: head(args...) — callable followed by parens
    call: $ => prec.left(1, seq(
      field("head", $._callable),
      "(",
      repeat($._form),
      ")",
    )),

    // Rule 2: head begin args... end — textual delimiters
    begin_end_call: $ => seq(
      field("head", $._callable),
      "begin",
      repeat($._form),
      "end",
    ),

    // Forms that can appear as the head of a call
    _callable: $ => choice(
      $.symbol,
      $.keyword,
      $.vector,
      $.map,
      $.set,
      $.call,           // call chaining: f(x)(y)
      $.begin_end_call,
      $.deref,
      $.var_quote,
      $.anonymous_function,
    ),

    // Atoms — leaf values
    _atom: $ => choice(
      $.symbol,
      $.keyword,
      $.number,
      $.string,
      $.character,
      $.regex,
      $.nil,
      $.boolean,
    ),

    // Data structures
    vector: $ => seq("[", repeat($._form), "]"),

    map: $ => seq("{", repeat($._form), "}"),

    set: $ => seq("#{", repeat($._form), "}"),

    // Anonymous function shorthand: #(body)
    anonymous_function: $ => seq("#(", repeat($._form), ")"),

    // Quoted list: '(f (g x)) — S-expression mode inside
    quoted_list: $ => prec(2, seq("'", "(", repeat($._sexp), ")")),

    // S-expression inside quoted lists (bare parens allowed)
    _sexp: $ => choice(
      $._atom,
      $.vector,
      $.map,
      $.set,
      $.sexp_list,
      $.deref,
      $.var_quote,
      $.metadata,
      $.tagged_literal,
      $.quoted_list,
      $.syntax_quote,
    ),

    sexp_list: $ => seq("(", repeat($._sexp), ")"),

    // Reader macros
    deref: $ => seq("@", $._form),

    quote: $ => seq("'", $._form),

    var_quote: $ => seq("#'", $.symbol),

    discard: $ => seq("#_", $._form),

    metadata: $ => seq(
      "^",
      field("meta", choice($.keyword, $.map, $.symbol, $.string)),
      field("value", $._form),
    ),

    // Tagged literals: #inst "2025-01-01", #uuid "..."
    tagged_literal: $ => seq(
      "#",
      field("tag", alias($.symbol, $.tag)),
      $._form,
    ),

    // Opaque forms — captured as raw text, delegated to host reader
    reader_conditional: $ => seq(
      choice("#?", "#?@"),
      "(",
      repeat($._form),
      ")",
    ),

    namespaced_map: $ => seq(
      /\#:[a-zA-Z_\-.*+!?<>=][a-zA-Z0-9_\-.*+!?<>=/':]*/,
      "{",
      repeat($._form),
      "}",
    ),

    syntax_quote: $ => seq("`", $._syntax_quote_body),

    _syntax_quote_body: $ => choice(
      $.symbol,
      $.keyword,
      $.string,
      $.character,
      $.number,
      seq("(", repeat($._syntax_quote_form), ")"),
      seq("[", repeat($._syntax_quote_form), "]"),
      seq("{", repeat($._syntax_quote_form), "}"),
      seq("#{", repeat($._syntax_quote_form), "}"),
    ),

    _syntax_quote_form: $ => choice(
      $._atom,
      $.unquote,
      $.unquote_splicing,
      seq("(", repeat($._syntax_quote_form), ")"),
      seq("[", repeat($._syntax_quote_form), "]"),
      seq("{", repeat($._syntax_quote_form), "}"),
      seq("#{", repeat($._syntax_quote_form), "}"),
      $.deref,
      $.metadata,
      $.syntax_quote,
      $.quoted_list,
    ),

    unquote: $ => seq("~", $._form),

    unquote_splicing: $ => seq("~@", $._form),

    // Terminals
    nil: _$ => "nil",
    boolean: _$ => choice("true", "false"),

    symbol: _$ => token(choice(
      "/",  // division operator
      /%&?/,  // anonymous function args: %, %1, %2, %&
      /%(0|[1-9][0-9]*)/,  // %1, %2, etc.
      seq(
        /[a-zA-Z_\-.*+!?<>=&][a-zA-Z0-9_\-.*+!?<>=&']*/,
        optional(seq("/", /[a-zA-Z_\-.*+!?<>=&][a-zA-Z0-9_\-.*+!?<>=&']*/)),
      ),
    )),

    keyword: _$ => token(choice(
      seq(":", /[a-zA-Z_\-.*+!?<>=][a-zA-Z0-9_\-.*+!?<>=/':]*/),
      seq("::", /[a-zA-Z_\-.*+!?<>=][a-zA-Z0-9_\-.*+!?<>=/':]*/),
    )),

    number: _$ => token(prec(1, choice(
      // Special literals
      "##Inf", "##-Inf", "##NaN",
      // Hex
      /0[xX][0-9a-fA-F]+N?/,
      // Octal
      /0[0-7]+N?/,
      // Ratio
      /-?[0-9]+\/[0-9]+/,
      // Decimal with optional scientific + BigDecimal/BigInt
      /-?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?[MN]?/,
    ))),

    string: _$ => token(seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        /\\./,
      )),
      '"',
    )),

    character: _$ => token(seq(
      "\\",
      choice(
        "newline", "space", "tab", "return", "backspace", "formfeed",
        /u[0-9a-fA-F]{4}/,    // unicode
        /o[0-7]{1,3}/,         // octal
        /./,                   // single char
      ),
    )),

    regex: _$ => token(seq(
      '#"',
      repeat(choice(
        /[^"\\]/,
        /\\./,
      )),
      '"',
    )),

    comment: _$ => token(seq(";", /.*/)),
  },
});
