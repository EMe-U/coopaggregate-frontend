import useGradeName from '../hooks/useGradeName'

// Grade names come from the grade table. In Kinyarwanda the grade's nameRw is shown when it is set;
// otherwise the built-in translation, or the name as it is for a grade added later.
export default function GradeName({ name }) {
  const gradeName = useGradeName()
  return gradeName(name)
}
