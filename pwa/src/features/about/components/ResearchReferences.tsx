import { researchReferences } from '../researchReferences'

export const ResearchReferences = () => (
  <ol className="research-references">
    {researchReferences.map((reference) => (
      <li key={reference.id}>
        <cite>{reference.title}</cite>
        <span>
          {reference.authors} · {reference.journal} · {reference.year}
        </span>
        <span>
          PMID:{' '}
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${reference.pmid}/`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {reference.pmid}
          </a>
          {reference.pmcid && (
            <>
              {' '}
              · PMCID:{' '}
              <a
                href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${reference.pmcid}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {reference.pmcid}
              </a>
            </>
          )}
          {' · '}DOI:{' '}
          <a
            href={`https://doi.org/${reference.doi}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {reference.doi}
          </a>
        </span>
      </li>
    ))}
  </ol>
)
