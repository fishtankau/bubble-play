import OmniEmbed from '../OmniEmbed'
import { useBrand } from '../../context/BrandContext'

export default function AppTab() {
  const { brand } = useBrand()
  return (
    <OmniEmbed
      contentPath={brand.embedAppPath}
      vanityDomain={brand.embedAppVanityDomain || brand.embedVanityDomain}
      secretProfile={brand.embedAppSecretProfile}
      themeId={brand.embedAppThemeId}
      title={`${brand.name} App`}
    />
  )
}
