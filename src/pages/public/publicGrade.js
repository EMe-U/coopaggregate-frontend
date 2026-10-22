// The grade's name for buyers: its Kinyarwanda name when the language is Kinyarwanda and it is set.
export function publicGradeName(grade, language) {
  return language.startsWith('rw') && grade.nameRw ? grade.nameRw : grade.name
}
