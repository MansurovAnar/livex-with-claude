import React, { useEffect, useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { listSchoolOptions } from '../../api/schools.api';
import { listVillages } from '../../api/villages.api';
import { useLanguage } from '../../i18n/LanguageContext';

// Loads options once per mount and maps rows to { value: id, label: name }
function useOptions(fetcher) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetcher()
      .then(res => { if (alive) setOptions((res.data.data || []).map(r => ({ value: r.id, label: r.name }))); })
      .catch(() => { if (alive) setOptions([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { options, loading };
}

// Keeps the saved choice visible when it is no longer in the active list (e.g. a deactivated village)
const withExtra = (options, extraOption) =>
  extraOption?.value && !options.some(o => String(o.value) === String(extraOption.value)) ? [extraOption, ...options] : options;

// Searchable dropdown of active schools; value = school id, onChange(id, { value, label })
export function SchoolSelect({ extraOption, ...props }) {
  const { t } = useLanguage();
  const { options, loading } = useOptions(listSchoolOptions);
  return <SearchableSelect placeholder={t('Search school...')} noOptionsText={t('No schools found.')} {...props} options={withExtra(options, extraOption)} loading={loading} />;
}

// Searchable dropdown of active villages; value = village id, onChange(id, { value, label })
export function VillageSelect({ extraOption, ...props }) {
  const { t } = useLanguage();
  const { options, loading } = useOptions(listVillages);
  return <SearchableSelect placeholder={t('Search village / street...')} noOptionsText={t('No villages found.')} {...props} options={withExtra(options, extraOption)} loading={loading} />;
}
