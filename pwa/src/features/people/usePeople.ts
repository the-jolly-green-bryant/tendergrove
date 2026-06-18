import { useQuery } from '@tanstack/react-query';

import { client } from '../../lib/api';

export function usePeople() {
    return useQuery({
        queryKey: ['people'],
        queryFn: async () => {
            const result = await client.models.Person.list();

            if (result.errors?.length) {
                throw new Error(result.errors[0].message);
            }

            return result.data;
        },
    });
}