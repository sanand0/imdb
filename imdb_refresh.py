# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pandas",
# ]
# ///
'''Fetch IMDb data and save movies, ratings & votes to movies.csv. Update metadata in info.json'''

import json
import pandas as pd
from datetime import datetime
from urllib.request import urlretrieve


if __name__ == '__main__':
    for path in ('title.ratings.tsv.gz', 'title.basics.tsv.gz'):
        urlretrieve(f'https://datasets.imdbws.com/{path}', path)  # noqa: S310 we trust IMDb
    kwargs = {'sep': '\t', 'encoding': 'utf-8', 'na_values': '\\N', 'low_memory': False}
    # Pick titles that are movies and series
    titles = pd.read_csv('title.basics.tsv.gz', **kwargs)
    titles['type'] = titles['titleType'].replace(
        {
            'tvSeries': 'series',
            'tvMovie': 'movie',
            'tvMiniSeries': 'series',
        }
    )
    titles = titles[titles['type'].isin({'movie', 'series'})]
    titles = titles[['tconst', 'primaryTitle', 'startYear', 'genres', 'type']]
    # Pick movies with min_votes ratings
    ratings = pd.read_csv('title.ratings.tsv.gz', **kwargs)
    ratings = ratings[ratings['numVotes'] > 10000]
    # Merge and save
    movies = ratings.merge(titles, on='tconst')
    movies.rename(
        columns={
            'tconst': 'ID',
            'averageRating': 'Rating',
            'startYear': 'Year',
            'numVotes': 'Votes',
            'primaryTitle': 'Title',
            'genres': 'Genre',
            'type': 'Type',
        },
        inplace=True,
    )
    movies.sort_values('Votes', ascending=False, inplace=True)
    movies.to_csv('movies.csv', encoding='utf-8', index=False)

    with open('info.json', 'w') as f:
        json.dump({'updated': datetime.now().isoformat()}, f)
