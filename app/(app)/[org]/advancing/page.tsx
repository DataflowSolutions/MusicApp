import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, ArrowLeft, Calendar, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { getAdvancingSessions } from '@/lib/actions/advancing'

interface AdvancingPageProps {
  params: Promise<{ org: string }>
  searchParams: Promise<{ show?: string }>
}

export default async function AdvancingPage({ params, searchParams }: AdvancingPageProps) {
  const { org: orgSlug } = await params
  const { show: showId } = await searchParams
  
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  // If filtering by show, get show details
  let show = null
  if (showId) {
    const { data: showData } = await supabase
      .from('shows')
      .select(`
        id, 
        title, 
        date,
        venues (
          name,
          city
        ),
        artists (
          name
        )
      `)
      .eq('id', showId)
      .eq('org_id', org.id)
      .single()
    
    show = showData
  }

  const sessions = await getAdvancingSessions(orgSlug)
  
  // Filter sessions by show if showId is provided
  const filteredSessions = showId 
    ? sessions.filter(session => session.show_id === showId)
    : sessions

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {show && (
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${orgSlug}/shows/${showId}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Show
              </Link>
            </Button>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {show ? `Advancing - ${show.title || 'Untitled Show'}` : 'Advancing'}
            </h1>
            <Button asChild>
              <Link href={`/${orgSlug}/advancing/new${showId ? `?showId=${showId}` : ''}`}>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Link>
            </Button>
          </div>
          
          {show ? (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(show.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              
              {show.venues && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {show.venues.name}, {show.venues.city}
                </div>
              )}
              
              {show.artists && Array.isArray(show.artists) && show.artists.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {show.artists.map((artist: { name: string }) => artist.name).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Collaborate with promoters and venues on show logistics and advancing.
            </p>
          )}
        </div>
        
        {show && (
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={`/${orgSlug}/advancing`}>
                <FileText className="w-4 h-4 mr-2" />
                All Sessions
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Sessions Grid */}
      <div className="space-y-4">
        {show && (
          <h2 className="text-lg font-semibold">
            Advancing Sessions for {show.title || 'Untitled Show'}
          </h2>
        )}
        
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {show ? 'No advancing sessions yet for this show' : 'No advancing sessions yet'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {show 
                  ? 'Create an advancing session to collaborate with the venue on technical details, hospitality, and show requirements.'
                  : 'Create your first advancing session to start collaborating with promoters and venues.'
                }
              </p>
              <Button asChild>
                <Link href={`/${orgSlug}/advancing/new${showId ? `?showId=${showId}` : ''}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  {show ? 'Create First Session' : 'Create Session'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={show ? "grid gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg line-clamp-1">
                    {session.title}
                  </CardTitle>
                  <Badge variant={session.expires_at ? 'default' : 'secondary'}>
                    {session.expires_at ? 'Active' : 'No Expiry'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Session Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created</span>
                    <span>{new Date(session.created_at).toLocaleDateString('en-US')}</span>
                  </div>
                  
                  {session.expires_at && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Expires</span>
                      <span>{new Date(session.expires_at).toLocaleDateString('en-US')}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/${orgSlug}/advancing/${session.id}`}>
                      Open Session
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
