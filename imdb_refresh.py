# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "numpy",
#     "pandas",
# ]
# ///
'''Fetch IMDb data and save movies, ratings & votes to movies.csv. Update metadata in info.json'''

import json
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
from urllib.request import urlretrieve


def outlier_movies(movies: pd.DataFrame) -> pd.DataFrame:
    valid = movies.dropna(subset=['Votes', 'Rating'])
    valid = valid[(valid['Votes'] > 0) & (valid['Rating'].notna())].copy()
    valid['_x'] = np.floor(
        ((np.log10(valid['Votes']) - 4) / (np.log10(3_000_000) - 4)) * 100 + 0.5
    ).astype(int)
    valid['_y'] = np.floor(((10 - valid['Rating']) / 9) * 50 + 0.5).astype(int)
    cells = valid[['_x', '_y']].drop_duplicates()
    top = cells.groupby('_x')['_y'].min()
    right = cells.groupby('_y')['_x'].max()
    top_cells = {(x, y) for x, y in top.items() if top.get(x - 1, 99) >= y and top.get(x + 1, 99) >= y}
    right_cells = {(x, y) for y, x in right.items() if right.get(y - 1, -1) <= x and right.get(y + 1, -1) <= x}
    outlier_cells = pd.MultiIndex.from_tuples(top_cells | right_cells, names=['_x', '_y'])
    result = valid[valid.set_index(['_x', '_y']).index.isin(outlier_cells)]
    return result.drop(columns=['_x', '_y']).sort_values('Votes', ascending=False)


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
    outliers = outlier_movies(movies)
    outliers.to_csv('outliers.csv', encoding='utf-8', index=False)
    now = datetime.now()
    outlier_log = Path('outliers') / f'{now:%Y}.tsv'
    outlier_log.parent.mkdir(exist_ok=True)
    outliers.assign(Date=now.date().isoformat())[['Date', 'ID', 'Rating', 'Votes', 'Year', 'Title', 'Genre', 'Type']].to_csv(
        outlier_log, sep='\t', mode='a', header=False, index=False
    )

    with open('info.json', 'w') as f:
        json.dump({'updated': now.isoformat(), 'outliers': outliers.set_index('ID').to_dict(orient='index')}, f)
