; Scope-creating forms
(call head: (symbol) @_name
  (#any-of? @_name "fn" "fn*" "let" "loop" "for" "doseq" "dotimes"
    "defn" "defn-" "defmacro" "binding" "with-open" "with-local-vars")) @local.scope

(begin_end_call head: (symbol) @_name
  (#any-of? @_name "fn" "fn*" "let" "loop" "for" "doseq" "dotimes"
    "defn" "defn-" "defmacro" "binding" "with-open" "with-local-vars")) @local.scope
