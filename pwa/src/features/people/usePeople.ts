import { useQuery } from '@tanstack/react-query';

import { client } from '../../lib/api';

const peopleSelectionSet = [
    'id',
    'displayName',
    'role',
    'avatarUrl',
    'archived',
    'checkIns.id',
    'checkIns.occurredAt',
    'checkIns.answersJson',
    'indicators.id',
    'indicators.polarity',
    'indicators.active',
] as const;

export function usePeople() {
    return useQuery({
        queryKey: ['people'],
        queryFn: async () => {
            const result = await client.models.Person.list({
                selectionSet: peopleSelectionSet,
            });

            if (result.errors?.length) {
                throw new Error(result.errors[0].message);
            }

            return result.data;
        },
    });
}